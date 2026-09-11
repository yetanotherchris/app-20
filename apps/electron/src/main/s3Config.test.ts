import { describe, expect, it } from 'vitest'
import { parseS3Config } from './s3Config'

function stored(value: unknown): string {
  return JSON.stringify(value)
}

describe('parseS3Config', () => {
  it('returns null for absent or unreadable input', () => {
    expect(parseS3Config(null)).toBeNull()
    expect(parseS3Config('not json')).toBeNull()
    expect(parseS3Config('[]')).toBeNull()
  })

  it('returns null without a valid bucket', () => {
    expect(parseS3Config(stored({ accessKeyId: 'AKIA', secretAccessKey: 's' }))).toBeNull()
    expect(
      parseS3Config(stored({ accessKeyId: 'AKIA', secretAccessKey: 's', bucket: 'Bad Bucket' })),
    ).toBeNull()
  })

  it('parses a full credential with region and endpoint', () => {
    expect(
      parseS3Config(
        stored({
          accessKeyId: 'AKIA',
          secretAccessKey: 's',
          bucket: 'my-bucket',
          region: 'eu-west-1',
          endpoint: 'http://127.0.0.1:9000',
        }),
      ),
    ).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 's',
      bucket: 'my-bucket',
      region: 'eu-west-1',
      endpoint: 'http://127.0.0.1:9000',
    })
  })

  it('defaults the region when it is absent or invalid', () => {
    const without = parseS3Config(
      stored({ accessKeyId: 'AKIA', secretAccessKey: 's', bucket: 'my-bucket' }),
    )
    expect(without?.region).toBe('us-east-1')

    const invalid = parseS3Config(
      stored({ accessKeyId: 'AKIA', secretAccessKey: 's', bucket: 'my-bucket', region: 'EU west' }),
    )
    expect(invalid?.region).toBe('us-east-1')
  })

  it('rejects an endpoint that is not http or https', () => {
    expect(
      parseS3Config(
        stored({
          accessKeyId: 'AKIA',
          secretAccessKey: 's',
          bucket: 'my-bucket',
          endpoint: 'ftp://example.com',
        }),
      ),
    ).toBeNull()
    expect(
      parseS3Config(
        stored({ accessKeyId: 'AKIA', secretAccessKey: 's', bucket: 'my-bucket', endpoint: 42 }),
      ),
    ).toBeNull()
  })
})
