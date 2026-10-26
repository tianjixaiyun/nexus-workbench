import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * React Bits 风格动效组件(自研复刻,无第三方依赖):
 * - BlurText   逐词模糊淡入(标题用)
 * - Marquee    无限横向滚动的徽标/文字带
 * - Aurora     渐变光斑缓慢漂移的背景层(Framer 式氛围)
 */

// ---------- BlurText:逐词从模糊中浮现 ----------
export function BlurText({ text, delay = 0, step = 110, className }: {
  text: string
  delay?: number
  step?: number
  className?: string
}) {
  const words = text.split(/(\s+)/)
  return (
    <span className={className}>
      {words.map((w, i) => {
        const isSpace = /^\s+$/.test(w)
        return (
          <span
            key={i}
            className="nexus-blur-word inline-block"
            style={{ animationDelay: `${delay + i * step}ms` }}
          >
            {isSpace ? '\u00A0' : w}
          </span>
        )
      })}
      <style>{`
        .nexus-blur-word {
          opacity: 0;
          filter: blur(10px);
          transform: translateY(8px);
          animation: nexus-blur-in 620ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
        }
        @keyframes nexus-blur-in {
          to { opacity: 1; filter: blur(0); transform: none }
        }
      `}</style>
    </span>
  )
}

// ---------- BorderBeam:沿卡片边框巡航的光束(Magic UI 式,自研实现) ----------
export function BorderBeam({ duration = 5.5, width = 1.5 }: { duration?: number; width?: number }) {
  return (
    <span
      aria-hidden
      className="nexus-beam"
      style={{ ['--beam-dur' as string]: duration + 's', ['--beam-w' as string]: width + 'px' }}
    >
      <style>{`
        .nexus-beam {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          padding: var(--beam-w);
          z-index: 2;
        }
        .nexus-beam::before {
          content: '';
          display: block;
          height: 100%;
          width: 100%;
          border-radius: inherit;
          background: conic-gradient(
            from var(--beam-angle),
            transparent 0turn,
            transparent 0.855turn,
            rgba(34, 211, 238, 0.9) 0.94turn,
            #eafcff 0.965turn,
            rgba(139, 92, 246, 0.9) 0.99turn,
            transparent 1turn
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: nexus-beam-spin var(--beam-dur) linear infinite;
        }
        @property --beam-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes nexus-beam-spin {
          to { --beam-angle: 360deg; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexus-beam::before { animation: none; opacity: 0.4; }
        }
      `}</style>
    </span>
  )
}

// ---------- Marquee:无限横向滚动带 ----------
export function Marquee({ items, className, reverse = false, speed = 26 }: {
  items: ReactNode[]
  className?: string
  reverse?: boolean
  speed?: number
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    // 纯 CSS 动画对 transform 生效最稳;JS 里只负责停悬
    const enter = () => { track.style.animationPlayState = 'paused' }
    const leave = () => { track.style.animationPlayState = 'running' }
    const wrap = track.parentElement!
    wrap.addEventListener('pointerenter', enter)
    wrap.addEventListener('pointerleave', leave)
    return () => {
      wrap.removeEventListener('pointerenter', enter)
      wrap.removeEventListener('pointerleave', leave)
    }
  }, [])

  const row = (
    <>
      {items.map((it, i) => (
        <span key={i} className="mx-4 inline-flex shrink-0 items-center gap-2">{it}</span>
      ))}
    </>
  )

  return (
    <div className={cn('nexus-marquee relative w-full overflow-hidden', className)}>
      <div
        ref={trackRef}
        className="flex w-max items-center whitespace-nowrap will-change-transform"
        style={{ animation: `nexus-marquee-scroll ${speed}s linear infinite ${reverse ? 'reverse' : 'normal'}` }}
      >
        <div className="flex items-center">{row}</div>
        <div className="flex items-center" aria-hidden>{row}</div>
      </div>
      <style>{`
        @keyframes nexus-marquee-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
    </div>
  )
}

// ---------- Aurora:缓慢漂移的极光光斑 ----------
export function Aurora({ className, opacity = 0.5 }: { className?: string; opacity?: number }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden style={{ opacity }}>
      <div
        className="nexus-aurora-1 absolute -top-[30%] -left-[15%] h-[70%] w-[60%] rounded-full blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.55), transparent 70%)' }}
      />
      <div
        className="nexus-aurora-2 absolute top-[10%] right-[-20%] h-[80%] w-[55%] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.45), transparent 70%)' }}
      />
      <div
        className="nexus-aurora-3 absolute bottom-[-25%] left-[25%] h-[60%] w-[50%] rounded-full blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.35), transparent 70%)' }}
      />
      <style>{`
        .nexus-aurora-1 { animation: nexus-aurora-a 16s ease-in-out infinite alternate }
        .nexus-aurora-2 { animation: nexus-aurora-b 20s ease-in-out infinite alternate }
        .nexus-aurora-3 { animation: nexus-aurora-a 24s ease-in-out infinite alternate-reverse }
        @keyframes nexus-aurora-a { from { transform: translate(0, 0) scale(1) } to { transform: translate(9%, 6%) scale(1.15) } }
        @keyframes nexus-aurora-b { from { transform: translate(0, 0) scale(1.1) } to { transform: translate(-8%, 8%) scale(0.95) } }
      `}</style>
    </div>
  )
}
