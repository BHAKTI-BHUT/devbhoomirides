export function DemoBadge({ label = 'DEMO DATA' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-marigold/40 bg-marigold-light px-2 py-0.5 text-[10px] font-bold tracking-wider text-marigold-dark">
      {label}
    </span>
  )
}
