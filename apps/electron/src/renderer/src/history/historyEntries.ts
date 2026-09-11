import type { ManifestEntry } from '@app-20/conversation-storage'

export const HISTORY_LIMIT = 10
export const UNTITLED_TITLE = 'Untitled'
export const UNKNOWN_MODEL = 'Unknown model'

/** The manifest is already newest first; the drawer shows only the most recent entries. */
export function recentEntries(entries: readonly ManifestEntry[]): ManifestEntry[] {
  return entries.slice(0, HISTORY_LIMIT)
}

export function historyTitle(entry: ManifestEntry): string {
  const title = entry.title.trim()
  return title.length > 0 ? title : UNTITLED_TITLE
}

export function historyModel(entry: ManifestEntry): string {
  const model = entry.model.trim()
  return model.length > 0 ? model : UNKNOWN_MODEL
}

/** Local calendar date of an ISO timestamp; empty string when it cannot be parsed. */
export function historyDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
