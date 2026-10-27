import { useEffect, useRef, useState } from 'react'
import { useNavigate as _useNavigate } from 'react-router'
import { create } from 'zustand'
import { cn } from '@/lib/utils'
import { useReducedMotion, prefersReducedMotion } from '@/lib/useReducedMotion'

/**
 * 全站级覆盖层:
 * - GlobalRipple   点击水波涟漪 + 微气泡(全局)
 * - LiquidCurtain  液态过场:页面切换时从点击处荡开一片水幕
 * - DiveIntro      下潜加载序幕(每次会话首次进入)
 */

void _useNavigate // 类型对齐用,无需运行时

// ---------- 点击水波涟漪 ----------
const RIPPLE_CSS = `
@keyframes nexus-ripple { from { transform: translate(-50%,-50%) scale(0.25); opacity: 0.75 } to { transform: translate(-50%,-50%) scale(5.5); opacity: 0 } }
@keyframes nexus-bubble-rise { 0% { transform: translateY(0) scale(0.8); opacity: 0 } 15% { opacity: 0.85 } 100% { transform: translateY(-56px) scale(1.15); opacity: 0 } }
.nexus-ripple { position: fixed; border-radius: 9999px; border: 2px solid rgba(140,225,255,0.65); pointer-events: none; z-index: 9998; animation: nexus-ripple 620ms ease-out forwards; box-shadow: 0 0 18px rgba(103,232,249,0.35) inset; }
.nexus-bubble { position: fixed; border-radius: 9999px; border: 1.5px solid rgba(180,235,255,0.7); pointer-events: none; z-index: 9998; animation: nexus-bubble-rise 850ms ease-out forwards; }
`

export function GlobalRipple() {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const style = document.createElement('style')
    style.textContent = RIPPLE_CSS
    document.head.appendChild(style)

    const onDown = (e: PointerEvent) => {
      const ripple = document.createElement('span')
      ripple.className = 'nexus-ripple'
      const size = 22
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${e.clientX}px`
      ripple.style.top = `${e.clientY}px`
      document.body.appendChild(ripple)
      setTimeout(() => ripple.remove(), 650)

      // 两颗小气泡,海洋气质
      for (let i = 0; i < 2; i++) {
        const b = document.createElement('span')
        b.className = 'nexus-bubble'
        const s = 4 + Math.random() * 6
        b.style.width = b.style.height = `${s}px`
        b.style.left = `${e.clientX + (Math.random() - 0.5) * 26 - s / 2}px`
        b.style.top = `${e.clientY - s / 2}px`
        b.style.animationDelay = `${i * 90}ms`
        document.body.appendChild(b)
        setTimeout(() => b.remove(), 950 + i * 90)
      }
    }
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      style.remove()
    }
  }, [reduced])
  return null
}

// ---------- 液态过场 ----------
interface CurtainState {
  phase: 'idle' | 'cover' | 'reveal'
  x: number
  y: number
  begin: (x: number, y: number) => void
  setPhase: (p: CurtainState['phase']) => void
}

const useCurtain = create<CurtainState>((set) => ({
  phase: 'idle',
  x: 0.5,
  y: 0.5,
  begin: (x, y) => set({ phase: 'cover', x, y }),
  setPhase: (phase) => set({ phase }),
}))

/** 液态过场导航:先荡开水幕盖住屏幕,切页后再退潮 */
export function liquidNavigate(
  navigate: (to: string) => void,
  to: string,
  e?: { clientX: number; clientY: number },
) {
  if (prefersReducedMotion()) { navigate(to); return }
  const s = useCurtain.getState()
  if (s.phase !== 'idle') {
    navigate(to)
    return
  }
  const x = e ? e.clientX / window.innerWidth : 0.5
  const y = e ? e.clientY / window.innerHeight : 0.5
  s.begin(x, y)
  setTimeout(() => navigate(to), 430)
  setTimeout(() => useCurtain.getState().setPhase('reveal'), 500)
  setTimeout(() => useCurtain.getState().setPhase('idle'), 1080)
}

export function LiquidCurtain() {
  const reduced = useReducedMotion()
  const { phase, x, y } = useCurtain()
  const covered = phase === 'cover'
  const revealing = phase === 'reveal'
  const pos = `${x * 100}% ${y * 100}%`
  if (reduced) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9990]"
      aria-hidden
      style={{ opacity: covered || revealing ? 1 : 0 }}
    >
      {/* 主水幕:从点击处圆形荡开 */}
      <div
        className="absolute inset-0 transition-[clip-path] duration-[430ms] ease-in-out"
        style={{
          background: `radial-gradient(circle at ${pos}, #10456b 0%, #072038 45%, #04101f 100%)`,
          clipPath: covered || revealing ? `circle(150vmax at ${pos})` : `circle(0vmax at ${pos})`,
          transitionDuration: revealing ? '520ms' : '430ms',
        }}
      >
        {/* 水面微光层,增加"液态"质感 */}
        <div
          className="absolute inset-0 transition-[clip-path] duration-[500ms] ease-in-out"
          style={{
            background: `radial-gradient(circle at ${pos}, rgba(124,231,255,0.22), transparent 42%)`,
            clipPath: covered || revealing ? `circle(120vmax at ${pos})` : `circle(0vmax at ${pos})`,
            transitionDelay: '60ms',
            transitionDuration: revealing ? '480ms' : '500ms',
          }}
        />
        {/* 中央气泡串 */}
        {covered && (
          <div className="absolute inset-0 overflow-hidden">
            {[18, 32, 46, 60, 74].map((left, i) => (
              <span
                key={i}
                className="absolute rounded-full border border-cyan-200/50"
                style={{
                  left: `${left + Math.sin(i) * 6}%`,
                  bottom: '-30px',
                  width: 10 + (i % 3) * 6,
                  height: 10 + (i % 3) * 6,
                  animation: `nexus-bubble-rise ${700 + i * 130}ms ease-out ${i * 70}ms forwards`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- 下潜加载序幕 ----------
const INTRO_KEY = 'nexus-dive-intro-done'

export function DiveIntro() {
  const reduced = useReducedMotion()
  const [state, setState] = useState<'run' | 'leave' | 'off'>(() => {
    if (reduced) return 'off'
    try { return sessionStorage.getItem(INTRO_KEY) ? 'off' : 'run' } catch { return 'off' }
  })
  const [depth, setDepth] = useState(0)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    if (reduced) {
      try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* 当前标签内保持跳过 */ }
      setState('off')
      return
    }
    if (state === 'leave') {
      const timer = window.setTimeout(() => setState('off'), 640)
      return () => clearTimeout(timer)
    }
    if (state !== 'run') return
    try { sessionStorage.setItem(INTRO_KEY, '1') } catch { /* 当前会话仍可正常退出 */ }
    const start = Date.now()
    // 用 setInterval 而非 rAF:后台标签页 rAF 会被暂停,序幕就卡住了
    const timer = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 1450)
      const eased = 1 - Math.pow(1 - t, 2.2)
      setDepth(Math.round(eased * 40))
      if (t >= 1) {
        clearInterval(timer)
        timersRef.current.push(window.setTimeout(() => setState('leave'), 220))
      }
    }, 40)
    return () => {
      clearInterval(timer)
      timersRef.current.forEach(clearTimeout)
    }
  }, [state, reduced])

  if (state === 'off' || reduced) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9995] flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1d33] via-[#061527] to-[#020a16] transition-transform duration-[640ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
        state === 'leave' && '-translate-y-full',
      )}
      aria-hidden
    >
      {/* 上升气泡 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full border border-cyan-200/40"
          style={{
            left: `${8 + i * 9 + Math.sin(i * 2.7) * 4}%`,
            bottom: '-24px',
            width: 6 + (i % 4) * 5,
            height: 6 + (i % 4) * 5,
            animation: `nexus-bubble-rise ${1000 + i * 160}ms ease-out ${i * 120}ms infinite`,
          }}
        />
      ))}
      <span className="neon-gradient-text text-sm font-bold tracking-[0.5em]">NEXUS</span>
      <p className="mt-4 font-mono text-4xl font-bold text-cyan-100 tabular-nums">-{depth}m</p>
      <div className="mt-6 h-px w-44 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-gradient-to-r from-sky-300 to-cyan-200 transition-[width] duration-100" style={{ width: `${(depth / 40) * 100}%` }} />
      </div>
      <p className="mt-5 text-[10px] tracking-[0.4em] text-white/45">正在下潜至你的数字海洋…</p>
    </div>
  )
}
