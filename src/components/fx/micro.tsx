import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/useReducedMotion'

/**
 * 通用微交互组件套件:
 * - ScrambleText 乱码解码式文字浮现
 * - Magnetic      磁性按钮(鼠标靠近被轻轻吸住)
 * - TiltCard      3D 倾斜 + 高光扫过的卡片
 * - CountUp       数字滚动计数
 */

// ---------- 乱码解码 ----------
const SCRAMBLE_POOL = '▚▞▖▗▘▙01#@$%&*+=<>/\\~^·海洋深处静专注'

export function ScrambleText({ text, delay = 0, speed = 34, className }: {
  text: string
  delay?: number
  speed?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState('')
  const timerRef = useRef(0)

  useEffect(() => {
    if (reduced) { setShown(text); return }
    let frame = 0
    let timer = 0
    let kickoff = 0
    const chars = [...text]
    const start = () => {
      timer = window.setInterval(() => {
        frame++
        // 每 2 帧解出一个字符
        const solved = Math.floor(frame / 2)
        let out = chars.slice(0, Math.min(solved, chars.length)).join('')
        for (let i = solved; i < chars.length; i++) {
          out += Math.random() < 0.72 ? SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)] : chars[i]
        }
        setShown(out)
        if (solved >= chars.length) {
          setShown(text)
          clearInterval(timer)
        }
      }, speed)
      timerRef.current = timer
    }
    if (delay > 0) kickoff = window.setTimeout(start, delay)
    else start()
    return () => {
      clearTimeout(kickoff)
      clearInterval(timer)
      clearInterval(timerRef.current)
    }
  }, [text, delay, speed, reduced])

  return <span className={className}>{reduced ? text : shown || '\u00A0'}</span>
}

// ---------- 磁性按钮 ----------
export function Magnetic({ children, strength = 0.32, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => { if (reduced && ref.current) ref.current.style.transform = 'none' }, [reduced])

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || reduced) return
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)'
  }

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn('inline-block transition-transform duration-200 ease-out', className)}
      style={{ willChange: 'transform' }}
    >
      {children}
    </span>
  )
}

// ---------- 3D 倾斜卡片 ----------
export function TiltCard({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (reduced && ref.current) ref.current.style.transform = 'none' }, [reduced])

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || reduced) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - py) * max
    const ry = (px - 0.5) * max
    el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn('group/tilt relative transition-transform duration-200 ease-out will-change-transform', className)}
    >
      {/* 跟随光标的柔光 */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
        style={{ background: 'radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(140,230,255,0.14), transparent 65%)' }}
      />
      {children}
    </div>
  )
}

// ---------- 数字滚动 ----------
export function CountUp({ value, duration = 1100, className }: { value: number; duration?: number; className?: string }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) { fromRef.current = value; setDisplay(value); return }
    const from = fromRef.current
    const start = Date.now()
    // setInterval 而非 rAF:后台/降帧环境也能稳定走完
    const timer = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t >= 1) {
        clearInterval(timer)
        fromRef.current = value
      }
    }, 33)
    return () => clearInterval(timer)
  }, [value, duration, reduced])

  return <span className={className}>{reduced ? value : display}</span>
}

// ---------- 滚动浮现(进入视口时上浮淡入,配 delay 做列表级联) ----------
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (reduced) { setShown(true); return }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700 ease-out', className)}
      style={{
        opacity: reduced || shown ? 1 : 0,
        transform: reduced || shown ? 'none' : 'translateY(26px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
