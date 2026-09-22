import { describe, expect, it } from 'vitest'
import { parseSettingsImport } from './settingsImport'

describe('parseSettingsImport', () => {
  it('parses a partial JSON patch without inventing fields', () => {
    expect(
      parseSettingsImport('settings.json', '{"apiKey":"key","s3":{"bucket":"bucket"}}'),
    ).toEqual({
      ok: true,
      patch: { apiKey: 'key', s3: { bucket: 'bucket' } },
    })
  })

  it('rejects duplicate and unknown text settings', () => {
    expect(parseSettingsImport('settings.txt', 'API_KEY=one\nAPI_KEY=two')).toEqual({
      ok: false,
      error: 'The file contains a duplicate setting.',
    })
    expect(parseSettingsImport('settings.txt', 'UNKNOWN=value')).toEqual({
      ok: false,
      error: 'The file contains an unknown setting.',
    })
  })
})
