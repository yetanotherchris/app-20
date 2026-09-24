import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import S3rver from '@20minutes/s3rver'

/** The dummy account s3rver accepts; unknown keys fail before the signature check. */
export const FAKE_S3_ACCESS_KEY = 'S3RVER'
export const FAKE_S3_SECRET_KEY = 'S3RVER'

export interface FakeS3 {
  endpoint: string
  bucket: string
  directory: string
  putText(key: string, text: string): Promise<void>
  getText(key: string): Promise<string | null>
  listKeys(): Promise<string[]>
  close(): Promise<void>
}

/**
 * In-process S3-compatible server for the spec 104 suite. `s3rver`'s v4
 * signature check rejects the AWS SDK's canonical request, so mismatched
 * signatures are allowed; an unknown access key still fails the account lookup,
 * which keeps the credential-rejection path testable.
 */
export async function startFakeS3(options: { bucket?: string } = {}): Promise<FakeS3> {
  const bucket = options.bucket ?? 'app20-test'
  const directory = await mkdtemp(join(tmpdir(), 'app20-s3-'))
  const server = new S3rver({
    port: 0,
    address: '127.0.0.1',
    silent: true,
    directory,
    allowMismatchedSignatures: true,
    configureBuckets: [{ name: bucket }],
  })
  const address = await server.run()
  const endpoint = `http://127.0.0.1:${address.port}`
  const client = new S3Client({
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: FAKE_S3_ACCESS_KEY, secretAccessKey: FAKE_S3_SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  return {
    endpoint,
    bucket,
    directory,
    async putText(key, text) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: text,
          ContentType: 'application/json',
        }),
      )
    },
    async getText(key) {
      try {
        const output = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        if (!output.Body) return null
        return await output.Body.transformToString()
      } catch {
        return null
      }
    },
    async listKeys() {
      const output = await client.send(new ListObjectsV2Command({ Bucket: bucket }))
      return (output.Contents ?? [])
        .map((object) => object.Key ?? '')
        .filter((key) => key.length > 0)
    },
    async close() {
      client.destroy()
      await server.close().catch(() => undefined)
      await rm(directory, { recursive: true, force: true }).catch(() => undefined)
    },
  }
}
