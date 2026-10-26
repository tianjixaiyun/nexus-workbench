import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 按住确认(Rauno Freiberg「invisible details」流派):
 * 破坏性操作不再弹二次确认框,而是按住不放——进度条充满才执行,
 * 用身体动作表达意图,误触松手即取消。
 */
interface HoldToConfirmProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** 需要按住的时长(ms) */
  holdMs?: number
  onConfirm: () => void
  children: ReactNode
}

export function HoldToConfirmButton({ holdMs = 750, onConfirm, children, className, ...rest }: HoldToConfirmProps) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const timer = useRef(0)
  const done = useRef(false)

  const start = () => {
    if (rest.disabled) return
    done.current = false
    setHolding(true)
    setProgress(0)
    const started = performance.now()
    timer.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / holdMs)
      setProgress(p)
      if (p >= 1) {
        stop()
        done.current = true
        onConfirm()
      }
    }, 16)
  }

  const stop = () => {
    clearInterval(timer.current)
    timer.current = 0
    setHolding(false)
    if (!done.current) setProgress(0)
  }

  return (
    <button
      {...rest}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('relative overflow-hidden select-none touch-none', className)}
      aria-label={rest['aria-label']}
    >
      {/* 进度填充:按住期间从左向右充满 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500/25 to-rose-500/45"
        style={{ width: `${progress * 100}%`, transition: holding ? 'none' : 'width 0.2s ease' }}
      />
      <span className={cn('relative flex items-center justify-center gap-1', progress > 0.55 && 'text-danger')}>{children}</span>
    </button>
  )
}
