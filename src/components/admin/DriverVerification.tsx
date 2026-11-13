import { useRouter } from '@tanstack/react-router'
import { BadgeCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDriverForReview, setDriverVerification, type DriverQueueItem } from '@/lib/admin.functions'
import { DOC_LABELS, VERIFICATION_STYLE } from '@/lib/driver-labels'
import type { DriverDetail } from '@/server/drivers'

type Filter = 'pending' | 'verified' | 'rejected' | 'suspended' | 'all'
const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.')

/** Admin driver verification queue: review profile, vehicle and documents, then approve / reject / suspend. */
export function DriverVerification({ drivers }: { drivers: DriverQueueItem[] }) {
  const [filter, setFilter] = useState<Filter>('pending')
  const [openId, setOpenId] = useState<string | null>(null)
  const list = filter === 'all' ? drivers : drivers.filter((d) => d.verification === filter)
  const count = (f: Filter) => (f === 'all' ? drivers.length : drivers.filter((d) => d.verification === f).length)

  return (
    <section className="mt-6 rounded-2xl border border-line bg-white p-5">
      <h2 className="flex items-center gap-2 font-bold text-ink"><BadgeCheck className="h-5 w-5 text-river" /> Driver verification</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['pending', 'verified', 'rejected', 'suspended', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${filter === f ? 'bg-pine-900 text-snow' : 'bg-snow text-stone ring-1 ring-line'}`}
          >
            {f === 'all' ? 'All' : VERIFICATION_STYLE[f].label} ({count(f)})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-stone">No drivers in this list.</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-stone">
            <tr><th className="py-2">Driver</th><th>Vehicle</th><th>Docs</th><th>Registered</th><th>Status</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((d) => (
              <tr key={d.id}>
                <td className="py-2.5"><div className="font-semibold text-ink">{d.displayName}</div><div className="text-xs text-stone">{d.email} · {d.phone}</div></td>
                <td>{d.vehicle}</td>
                <td className="tabular-nums">{d.documentCount}</td>
                <td>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${VERIFICATION_STYLE[d.verification].cls}`}>{VERIFICATION_STYLE[d.verification].label}</span></td>
                <td className="text-right"><button onClick={() => setOpenId(d.id)} className="font-semibold text-pine-700">Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {openId && <DriverReview key={openId} driverId={openId} onClose={() => setOpenId(null)} />}
    </section>
  )
}

function DriverReview({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const router = useRouter()
  const [detail, setDetail] = useState<DriverDetail | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getDriverForReview({ data: { driverId } }).then(setDetail, (err) => setError(errorText(err)))
  }, [driverId])

  async function act(action: 'approve' | 'reject' | 'suspend' | 'reactivate') {
    setBusy(true)
    setError('')
    try {
      await setDriverVerification({ data: { driverId, action, note: note || undefined } })
      setDetail(await getDriverForReview({ data: { driverId } }))
      setNote('')
      await router.invalidate()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const p = detail?.profile
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-pine-900">{p?.displayName ?? 'Driver'}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-stone" /></button>
        </div>
        {!p ? (
          <p className="mt-4 text-sm text-stone">{error || 'Loading…'}</p>
        ) : (
          <>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${VERIFICATION_STYLE[p.verification].cls}`}>{VERIFICATION_STYLE[p.verification].label}</span>
            {p.verificationNote && <p className="mt-2 text-sm text-stone">Last note: {p.verificationNote}</p>}
            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-stone">Profile</h4>
            <dl className="mt-1 space-y-1 text-sm">
              {[
                ['Email', p.email],
                ['Mobile', p.phone],
                ['Licence number', p.licenceNumber],
                ['Licence expiry', p.licenceExpiry],
                ['Emergency contact', p.emergencyContact],
                ['Registered', new Date(p.createdAt).toLocaleString('en-IN')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-stone">{k}</dt><dd className="text-right font-semibold text-ink">{v || '—'}</dd></div>
              ))}
            </dl>
            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-stone">Vehicle</h4>
            {detail.vehicles.map((v) => (
              <p key={v.id} className="mt-1 text-sm text-ink">
                <span className="font-semibold">{v.registrationNumber}</span> · {v.type} · {v.model} · {v.passengerSeats} seats · {v.status}
              </p>
            ))}
            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-stone">Documents</h4>
            {detail.documents.length === 0 ? (
              <p className="mt-1 text-sm text-marigold-dark">No documents uploaded yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-line text-sm">
                {detail.documents.map((d) => (
                  <li key={d.id} className="flex justify-between py-1.5">
                    <span><span className="font-semibold">{DOC_LABELS[d.type]}</span> <span className="text-stone">· {d.fileName}</span></span>
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-semibold text-pine-700">Open</a>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="mt-5 text-xs font-bold uppercase tracking-wide text-stone">Decision</h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason (required to reject or suspend; shown to the driver)"
              className="mt-1 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-pine-700"
              rows={3}
            />
            {error && <p className="mt-1 text-sm font-medium text-red-700">{error}</p>}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {p.verification === 'suspended' ? (
                <button disabled={busy} onClick={() => act('reactivate')} className="col-span-3 rounded-xl bg-pine-900 py-2.5 font-bold text-snow disabled:opacity-60">Reactivate</button>
              ) : (
                <>
                  <button disabled={busy || p.verification === 'verified'} onClick={() => act('approve')} className="rounded-xl bg-pine-900 py-2.5 font-bold text-snow disabled:opacity-40">Approve</button>
                  <button disabled={busy || p.verification === 'rejected'} onClick={() => act('reject')} className="rounded-xl border border-red-200 py-2.5 font-bold text-red-700 disabled:opacity-40">Reject</button>
                  <button disabled={busy} onClick={() => act('suspend')} className="rounded-xl border border-line py-2.5 font-bold text-ink disabled:opacity-40">Suspend</button>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
