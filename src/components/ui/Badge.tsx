import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeTone = 'cyan' | 'violet' | 'rose' | 'amber' | 'emerald' | 'slate'

const tones: Record<BadgeTone, string> = {
  cyan: 'bg-accent-soft text-accent border-accent',
  violet: 'bg-violet-400/10 text-accent-2 border-violet-400/25',
  rose: 'bg-rose-400/10 text-danger border-rose-400/25',
  amber: 'bg-amber-400/10 text-warn border-amber-400/25',
  emerald: 'bg-emerald-400/10 text-success border-emerald-400/25',
  slate: 'bg-slate-400/10 text-txt-secondary border-slate-400/25',
}

export function Badge({
  tone = 'slate',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
