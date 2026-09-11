/**
 * Encodes the `Buffer` that `safeStorage.encryptString` returns the way VS
 * Code's `EncryptionMainService` stores it: `JSON.stringify(buffer)`, which
 * yields `{"type":"Buffer","data":[...]}`. Decoding parses the value and
 * rebuilds the `Buffer`, returning null for anything malformed, including the
 * base64 an earlier build wrote.
 */
export function encodeEncrypted(buffer: Buffer): string {
  return JSON.stringify(buffer)
}

export function decodeEncrypted(value: string): Buffer | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed === null || typeof parsed !== 'object') return null
    const data = (parsed as { data?: unknown }).data
    if (!Array.isArray(data)) return null
    return Buffer.from(data)
  } catch {
    return null
  }
}
