// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodeEncrypted, encodeEncrypted } from './secretEncoding'

describe('secret encoding', () => {
  it('round-trips a buffer through the VS Code JSON shape', () => {
    const buffer = Buffer.from([0x76, 0x31, 0x30, 1, 2, 255])
    const encoded = encodeEncrypted(buffer)
    expect(JSON.parse(encoded)).toEqual({ type: 'Buffer', data: [0x76, 0x31, 0x30, 1, 2, 255] })
    expect(decodeEncrypted(encoded)).toEqual(buffer)
  })

  it('returns null for the base64 an earlier build wrote', () => {
    expect(decodeEncrypted(Buffer.from([1, 2, 3]).toString('base64'))).toBeNull()
  })

  it('returns null for malformed values', () => {
    expect(decodeEncrypted('not json')).toBeNull()
    expect(decodeEncrypted('[1,2,3]')).toBeNull()
    expect(decodeEncrypted('{"type":"Buffer"}')).toBeNull()
    expect(decodeEncrypted('null')).toBeNull()
  })
})
