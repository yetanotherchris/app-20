import { describe, expect, it } from 'vitest'
import type { S3Client } from '@aws-sdk/client-s3'
import { RemoteMissingError } from '@app-20/sync'
import { clientOptions, createS3Remote, isMissingS3Error, S3_PREFIX } from './s3Remote'
import type { S3Config } from './s3Config'

const baseConfig: S3Config = {
  accessKeyId: 'AKIA',
  secretAccessKey: 'secret',
  bucket: 'my-bucket',
  region: 'eu-west-1',
}

interface SendOptions {
  abortSignal?: AbortSignal
}

interface CommandInput {
  Key?: string
  ContinuationToken?: string
  Body?: string
}

function commandInput(command: unknown): CommandInput {
  if (command === null || typeof command !== 'object') return {}
  const input = (command as { input?: unknown }).input
  return input !== null && typeof input === 'object' ? (input as CommandInput) : {}
}

function fakeClient(
  handler: (command: unknown, options?: SendOptions) => Promise<unknown>,
): S3Client {
  return {
    send: (command: unknown, options?: SendOptions) => handler(command, options),
  } as unknown as S3Client
}

describe('clientOptions', () => {
  it('uses the region and static credentials and disables flexible checksums', () => {
    const options = clientOptions(baseConfig)
    expect(options.region).toBe('eu-west-1')
    expect(options.credentials).toEqual({ accessKeyId: 'AKIA', secretAccessKey: 'secret' })
    expect(options.requestChecksumCalculation).toBe('WHEN_REQUIRED')
    expect(options.responseChecksumValidation).toBe('WHEN_REQUIRED')
  })

  it('leaves AWS addressing unchanged when there is no endpoint', () => {
    const options = clientOptions(baseConfig)
    expect(options.endpoint).toBeUndefined()
    expect(options.forcePathStyle).toBeUndefined()
  })

  it('uses path-style addressing when an endpoint is configured', () => {
    const options = clientOptions({ ...baseConfig, endpoint: 'http://127.0.0.1:9000' })
    expect(options.endpoint).toBe('http://127.0.0.1:9000')
    expect(options.forcePathStyle).toBe(true)
  })
})

describe('isMissingS3Error', () => {
  it('recognises an absent object', () => {
    expect(isMissingS3Error({ name: 'NoSuchKey' })).toBe(true)
    expect(isMissingS3Error({ name: 'NotFound' })).toBe(true)
    expect(isMissingS3Error({ $metadata: { httpStatusCode: 404 } })).toBe(true)
  })

  it('does not treat other failures as missing', () => {
    expect(isMissingS3Error({ name: 'AccessDenied' })).toBe(false)
    expect(isMissingS3Error({ name: 'NetworkingError' })).toBe(false)
    expect(isMissingS3Error(null)).toBe(false)
    expect(isMissingS3Error('nope')).toBe(false)
  })
})

describe('createS3Remote.listNames', () => {
  it('pages through the prefix and strips it from each key', async () => {
    const tokens: (string | undefined)[] = []
    const client = fakeClient(async (command) => {
      const input = commandInput(command)
      tokens.push(input.ContinuationToken)
      if (input.ContinuationToken === undefined) {
        return {
          Contents: [{ Key: `${S3_PREFIX}a.json` }, { Key: 'other/ignored.json' }],
          IsTruncated: true,
          NextContinuationToken: 'page-2',
        }
      }
      return { Contents: [{ Key: `${S3_PREFIX}b.json` }], IsTruncated: false }
    })

    const names = await createS3Remote(baseConfig, client).listNames()

    expect(names).toEqual(['a.json', 'b.json'])
    expect(tokens).toEqual([undefined, 'page-2'])
  })
})

describe('createS3Remote.readText', () => {
  it('returns the object body', async () => {
    const client = fakeClient(async () => ({
      Body: { transformToString: async () => '{"id":"a"}' },
    }))
    await expect(createS3Remote(baseConfig, client).readText('a.json')).resolves.toBe('{"id":"a"}')
  })

  it('maps a missing key to RemoteMissingError', async () => {
    const client = fakeClient(async () => {
      throw { name: 'NoSuchKey' }
    })
    await expect(createS3Remote(baseConfig, client).readText('a.json')).rejects.toBeInstanceOf(
      RemoteMissingError,
    )
  })

  it('does not map other failures to missing', async () => {
    const client = fakeClient(async () => {
      throw { name: 'AccessDenied' }
    })
    await expect(createS3Remote(baseConfig, client).readText('a.json')).rejects.not.toBeInstanceOf(
      RemoteMissingError,
    )
  })

  it('aborts and reports a timeout when a request does not complete', async () => {
    const client = fakeClient(
      (_command, options) =>
        new Promise((_resolve, reject) => {
          options?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    await expect(createS3Remote(baseConfig, client, 5).readText('a.json')).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })
})

describe('createS3Remote.writeText', () => {
  it('writes the prefixed key with the exact body', async () => {
    let seen: CommandInput | undefined
    const client = fakeClient(async (command) => {
      seen = commandInput(command)
      return {}
    })

    await createS3Remote(baseConfig, client).writeText('a.json', '{"id":"a"}')

    expect(seen?.Key).toBe(`${S3_PREFIX}a.json`)
    expect(seen?.Body).toBe('{"id":"a"}')
  })
})

describe('prefix', () => {
  it('namespaces conversation objects under one prefix', () => {
    expect(S3_PREFIX).toBe('conversations/')
  })
})
