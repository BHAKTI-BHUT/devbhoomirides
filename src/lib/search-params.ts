import type { SearchQuery } from './trips'

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

export function parseSearch(s: Record<string, unknown>): SearchQuery {
  return { from: str(s.from), to: str(s.to), date: str(s.date) }
}
