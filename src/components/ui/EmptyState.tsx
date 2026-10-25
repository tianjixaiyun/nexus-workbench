import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  hint?: string
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, hint, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-2xl border border-line-2 bg-surface-1 p-4">
        <Icon size={28} className="text-txt-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-txt-secondary">{title}</p>
        {hint && <p className="mt-1 text-xs text-txt-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
