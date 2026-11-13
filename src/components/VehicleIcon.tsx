import { Bus, CarFront } from 'lucide-react'

export function VehicleThumb({ type, photoUrl }: { type: string; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={type} className="h-14 w-14 rounded-xl object-cover" />
  }
  const Icon = /tempo|traveller|bus/i.test(type) ? Bus : CarFront
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-pine-50 text-pine-700">
      <Icon className="h-7 w-7" strokeWidth={1.6} />
    </div>
  )
}
