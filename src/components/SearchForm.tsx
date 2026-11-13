import { useNavigate } from '@tanstack/react-router'
import { ArrowUpDown, CalendarDays, MapPin, Navigation, Search } from 'lucide-react'
import { useState } from 'react'
import { todayISO } from '@/lib/format'
import { t } from '@/lib/i18n'
import { allStops } from '@/lib/trips'

export function SearchForm({
  initial,
  compact = false,
}: {
  initial?: { from?: string; to?: string; date?: string }
  compact?: boolean
}) {
  const navigate = useNavigate()
  const stops = allStops()
  const [from, setFrom] = useState(initial?.from ?? 'dehradun')
  const [to, setTo] = useState(initial?.to ?? 'karnaprayag')
  const [date, setDate] = useState(initial?.date ?? todayISO(1))
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (from === to) {
      setError('Pickup and destination must be different.')
      return
    }
    setError('')
    navigate({ to: '/app/search', search: { from, to, date } })
  }

  const field = 'w-full appearance-none bg-transparent text-base font-semibold text-ink outline-none'

  return (
    <form onSubmit={submit} className={`rounded-2xl bg-white ${compact ? 'p-3' : 'p-4'} shadow-xl shadow-pine-900/10 ring-1 ring-line`}>
      {!compact && <h2 className="mb-3 font-display text-lg font-bold text-pine-900">{t('searchTitle')}</h2>}
      <div className="relative rounded-xl border border-line">
        <label className="flex items-center gap-3 px-3 py-2.5">
          <Navigation className="h-4 w-4 shrink-0 text-river" />
          <div className="flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone">{t('from')}</span>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={field}>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </label>
        <div className="mx-3 border-t border-line" />
        <label className="flex items-center gap-3 px-3 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-marigold-dark" />
          <div className="flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone">{t('to')}</span>
            <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </label>
        <button
          type="button"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
          aria-label={t('swap')}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-snow text-pine-800 hover:bg-pine-50"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </div>
      <label className="mt-2 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-pine-700" />
        <div className="flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-stone">{t('travelDate')}</span>
          <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className={field} required />
        </div>
      </label>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      <button
        type="submit"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-marigold px-4 py-3.5 text-base font-bold text-pine-950 transition hover:bg-marigold-dark hover:text-white"
      >
        <Search className="h-5 w-5" /> {t('searchButton')}
      </button>
    </form>
  )
}
