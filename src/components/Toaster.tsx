import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastItem } from '@/stores/toastStore'

/**
 * sonner 式堆叠通知(X 上 Emil Kowalski 的动效流派,自研实现):
 * 右下角堆叠、自动消退、点按即消;进出动画都有明确目的。
 * 计时用 setTimeout(不依赖 rAF),减动效时直接出现/消失。
 */

const AUTO_DISMISS_MS = 4200

const KIND_META = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  error: { icon: AlertCircle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-accent' },
} as const

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef(0)

  const close = () => {
    if (leaving) return
    setLeaving(true)
    // 退出动画播完再真正移除
    window.setTimeout(() => dismiss(toast.id), 190)
  }

  useEffect(() => {
    timer.current = window.setTimeout(close, AUTO_DISMISS_MS)
    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { icon: Icon, cls } = KIND_META[toast.kind]

  return (
    <div
      onClick={close}
      className={`nexus-toast glass-card flex w-80 cursor-pointer items-start gap-3 px-4 py-3 shadow-[0_12px_40px_rgba(2,8,20,0.45)] ${leaving ? 'nexus-toast-out' : ''}`}
      role="status"
    >
      <Icon size={17} className={`mt-0.5 shrink-0 ${cls}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-txt-primary">{toast.title}</p>
        {toast.desc && <p className="mt-0.5 text-xs leading-relaxed text-txt-secondary">{toast.desc}</p>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          close()
        }}
        className="cursor-pointer rounded-md p-0.5 text-txt-muted transition-colors hover:text-txt-secondary"
        aria-label="关闭通知"
      >
        <X size={13} />
      </button>
      <style>{`
        .nexus-toast { animation: nexus-toast-in 300ms cubic-bezier(0.21, 1.02, 0.73, 1) both; }
        .nexus-toast-out { animation: nexus-toast-out 180ms ease-in both; }
        @keyframes nexus-toast-in {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        @keyframes nexus-toast-out {
          to { opacity: 0; transform: translateY(8px) scale(0.97); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexus-toast, .nexus-toast-out { animation: none; }
        }
      `}</style>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed right-4 bottom-24 z-[10005] flex flex-col items-end gap-2.5">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  )
}
