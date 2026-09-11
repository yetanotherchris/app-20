import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { RemoteMissingError, type SyncRemote } from '@app-20/sync'
import type { S3Config } from './s3Config'

/** All conversation objects live under one prefix so the bucket can hold other data. */
export const S3_PREFIX = 'conversations/'

/**
 * Bounds every request so an unresponsive endpoint cannot wedge the sync queue.
 * The AWS SDK's own handler has no default request timeout.
 */
export const S3_REQUEST_TIMEOUT_MS = 15_000

/**
 * Path-style addressing and a fixed endpoint are set only for an S3-compatible
 * server; AWS uses virtual-hosted style and its own endpoint resolution. The
 * checksum downgrades keep the client from adding flexible-checksum headers
 * that non-AWS servers may reject, while remaining valid against AWS.
 */
export function clientOptions(config: S3Config): S3ClientConfig {
  const options: S3ClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  }
  if (config.endpoint) {
    options.endpoint = config.endpoint
    options.forcePathStyle = true
  }
  return options
}

/** Distinguishes an absent object from an authorization or network failure. */
export function isMissingS3Error(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  const name = (error as { name?: unknown }).name
  const status = (error as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode
  return name === 'NoSuchKey' || name === 'NotFound' || status === 404
}

function timeoutError(): Error {
  const error = new Error('S3 request timed out')
  error.name = 'TimeoutError'
  return error
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await run(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) throw timeoutError()
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function keyFor(name: string): string {
  return `${S3_PREFIX}${name}`
}

export function createS3Remote(
  config: S3Config,
  client: S3Client = new S3Client(clientOptions(config)),
  requestTimeoutMs: number = S3_REQUEST_TIMEOUT_MS,
): SyncRemote {
  return {
    async listNames() {
      const names: string[] = []
      let token: string | undefined
      do {
        const page = await withTimeout(
          (signal) =>
            client.send(
              new ListObjectsV2Command({
                Bucket: config.bucket,
                Prefix: S3_PREFIX,
                ...(token === undefined ? {} : { ContinuationToken: token }),
              }),
              { abortSignal: signal },
            ),
          requestTimeoutMs,
        )
        for (const object of page.Contents ?? []) {
          const key = object.Key
          if (key !== undefined && key.startsWith(S3_PREFIX)) {
            names.push(key.slice(S3_PREFIX.length))
          }
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined
      } while (token !== undefined)
      return names
    },

    async readText(name) {
      try {
        const output = await withTimeout(
          (signal) =>
            client.send(new GetObjectCommand({ Bucket: config.bucket, Key: keyFor(name) }), {
              abortSignal: signal,
            }),
          requestTimeoutMs,
        )
        if (!output.Body) throw new RemoteMissingError(name)
        return await output.Body.transformToString()
      } catch (error) {
        if (isMissingS3Error(error)) throw new RemoteMissingError(name)
        throw error
      }
    },

    async writeText(name, content) {
      await withTimeout(
        (signal) =>
          client.send(
            new PutObjectCommand({
              Bucket: config.bucket,
              Key: keyFor(name),
              Body: content,
              ContentType: 'application/json',
            }),
            { abortSignal: signal },
          ),
        requestTimeoutMs,
      )
    },
  }
}
