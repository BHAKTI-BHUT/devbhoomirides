import { formatTime } from '@/lib/format'

type Stop = { id: string; name: string; eta?: string; note?: string }

/** Vertical stop-by-stop route. Highlights the pickup → drop segment when given. */
export function RouteLine({
  stops,
  pickupId,
  dropId,
  dark = false,
}: {
  stops: Stop[]
  pickupId?: string
  dropId?: string
  dark?: boolean
}) {
  const p = pickupId ? stops.findIndex((s) => s.id === pickupId) : -1
  const d = dropId ? stops.findIndex((s) => s.id === dropId) : -1
  const inSegment = (i: number) => p !== -1 && d !== -1 && i >= p && i <= d
  return (
    <ol className="relative">
      {stops.map((s, i) => {
        const active = inSegment(i)
        const isEnd = i === p || i === d
        const last = i === stops.length - 1
        return (
          <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[9px] top-5 h-[calc(100%-12px)] w-0.5 ${
                  active && i < d ? 'bg-marigold' : dark ? 'bg-white/20' : 'bg-line'
                }`}
              />
            )}
            <span
              className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                isEnd
                  ? 'border-marigold bg-marigold'
                  : active
                    ? 'border-marigold bg-white'
                    : dark
                      ? 'border-white/40 bg-pine-900'
                      : 'border-pine-700/40 bg-white'
              }`}
            >
              {isEnd && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <div>
                <div className={`font-semibold ${dark ? 'text-snow' : active || p === -1 ? 'text-ink' : 'text-stone'}`}>
                  {s.name}
                </div>
                {s.note && <div className={`text-xs ${dark ? 'text-white/60' : 'text-stone'}`}>{s.note}</div>}
              </div>
              {s.eta && (
                <span className={`shrink-0 text-sm tabular-nums ${dark ? 'text-white/70' : 'text-stone'}`}>
                  {formatTime(s.eta)}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
