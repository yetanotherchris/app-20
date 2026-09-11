import { describe, expect, it } from 'vitest'
import type { ManifestEntry } from '@app-20/conversation-storage'
import {
  HISTORY_LIMIT,
  UNKNOWN_MODEL,
  UNTITLED_TITLE,
  historyDate,
  historyModel,
  historyTitle,
  recentEntries,
} from './historyEntries'

function entry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: 'conversation-1',
    fileName: 'conversation-1.json',
    title: 'A title',
    model: 'openrouter/auto',
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  }
}

describe('recentEntries', () => {
  it('keeps the manifest order', () => {
    const entries = [entry({ id: 'newest' }), entry({ id: 'older' })]
    expect(recentEntries(entries).map((item) => item.id)).toEqual(['newest', 'older'])
  })

  it('caps the list at the history limit', () => {
    const entries = Array.from({ length: HISTORY_LIMIT + 5 }, (_value, index) =>
      entry({ id: `conversation-${index}` }),
    )
    expect(recentEntries(entries)).toHaveLength(HISTORY_LIMIT)
  })
})

describe('historyTitle', () => {
  it('returns the trimmed title when present', () => {
    expect(historyTitle(entry({ title: '  Hello there  ' }))).toBe('Hello there')
  })

  it('returns the placeholder for an empty or whitespace title', () => {
    expect(historyTitle(entry({ title: '' }))).toBe(UNTITLED_TITLE)
    expect(historyTitle(entry({ title: '   ' }))).toBe(UNTITLED_TITLE)
  })
})

describe('historyModel', () => {
  it('returns the model when present', () => {
    expect(historyModel(entry({ model: 'openrouter/auto' }))).toBe('openrouter/auto')
  })

  it('returns the fallback for an empty model', () => {
    expect(historyModel(entry({ model: '' }))).toBe(UNKNOWN_MODEL)
  })
})

describe('historyDate', () => {
  it('formats an ISO timestamp as a local calendar date', () => {
    const local = new Date(2026, 8, 10, 12, 0, 0)
    expect(historyDate(local.toISOString())).toBe('2026-09-10')
  })

  it('returns an empty string for an unparseable value', () => {
    expect(historyDate('not-a-date')).toBe('')
  })
})
