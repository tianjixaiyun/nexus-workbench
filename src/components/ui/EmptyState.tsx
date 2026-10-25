import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStep {
  title: string
  desc: string
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  hint?: string
  children?: ReactNode
  /** 序号步骤卡:空状态不止说"没有",还告诉新用户怎么开始 */
  steps?: EmptyStep[]
}

const SERIF = 'Georgia, "Times New Roman", "Songti SC", serif'

export function EmptyState({ icon: Icon, title, hint, children, steps }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="rounded-2xl border border-line-2 bg-surface-1 p-4">
        <Icon size={28} className="text-txt-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-txt-secondary">{title}</p>
        {hint && <p className="mt-1 text-xs text-txt-muted">{hint}</p>}
      </div>
      {children}
      {steps && steps.length > 0 && (
        <div className="mt-4 grid w-full max-w-2xl gap-3 px-2 sm:grid-cols-3">
          {steps.map((st, i) => (
            <div
              key={st.title}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-line-1 bg-surface-1 p-4 text-left',
                'nexus-empty-step',
              )}
              style={{ animationDelay: `${i * 130}ms` }}
            >
              <style>{`
                .nexus-empty-step { opacity: 0; transform: translateY(14px); animation: nexus-empty-in 520ms cubic-bezier(.2,.7,.3,1) forwards }
                @keyframes nexus-empty-in { to { opacity: 1; transform: none } }
              `}</style>
              <span className="font-mono text-2xl font-bold text-accent/35" style={{ fontFamily: SERIF }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-1.5 text-sm font-semibold text-txt-primary">{st.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-txt-muted">{st.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
