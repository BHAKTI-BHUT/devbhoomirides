import { Link } from '@tanstack/react-router'

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#12372f" />
      <path d="M6 29 L15 15 L20 22 L25 12 L34 29 Z" fill="#245e50" />
      <path d="M22.5 16.5 L25 12 L27.6 17 Z" fill="#f8f6f1" />
      <path d="M6 31 C14 26 22 34 34 28" stroke="#f2a20c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ to = '/', light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-xl font-bold tracking-tight ${light ? 'text-snow' : 'text-pine-900'}`}>
        Devbhoomi <span className="text-marigold">Rides</span>
      </span>
    </Link>
  )
}
