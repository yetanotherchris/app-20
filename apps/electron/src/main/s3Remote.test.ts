import { describe, expect, it } from 'vitest'
import { clientOptions, isMissingS3Error, S3_PREFIX } from './s3Remote'
import type { S3Config } from './secrets'

const baseConfig: S3Config = {
  accessKeyId: 'AKIA',
  secretAccessKey: 'secret',
  bucket: 'my-bucket',
  region: 'eu-west-1',
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

describe('prefix', () => {
  it('namespaces conversation objects under one prefix', () => {
    expect(S3_PREFIX).toBe('conversations/')
  })
})
