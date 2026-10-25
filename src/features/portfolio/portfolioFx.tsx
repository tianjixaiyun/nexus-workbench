import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { WorkItem } from '@/lib/data/types'

/** hero 图片串跟随:鼠标在 hero 区移动,每隔一段距离弹出一枚作品小图,渐大渐隐 */
export function HeroImageTrail({ works, children }: { works: WorkItem[]; children: ReactNode }) {
  const [pops, setPops] = useState<{ id: number; x: number; y: number; src: string }[]>([])
  const last = useRef({ x: -999, y: -999 })
  const cursor = useRef(0)
  const seq = useRef(0)

  const onMove = (e: React.PointerEvent) => {
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    if (dx * dx + dy * dy < 8100) return // 90px 触发一次
    last.current = { x: e.clientX, y: e.clientY }
    if (!works.length) return
    const w = works[cursor.current % works.length]
    cursor.current++
    const id = seq.current++
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPops((ps) => [...ps.slice(-5), { id, x: e.clientX - rect.left, y: e.clientY - rect.top, src: w.images[0] }])
    setTimeout(() => setPops((ps) => ps.filter((p) => p.id !== id)), 900)
  }

  if (!works.length) return <>{children}</>

  return (
    <div onPointerMove={onMove} className="relative">
      {children}
      {pops.map((p) => (
        <img
          key={p.id}
          src={p.src}
          alt=""
          className="pointer-events-none absolute z-10 hidden w-40 rotate-3 rounded-xl border border-black/10 object-cover shadow-2xl md:block"
          style={{
            left: p.x - 80,
            top: p.y - 55,
            animation: 'nexus-pop-in 880ms cubic-bezier(.2,.7,.3,1) forwards',
          }}
        />
      ))}
      <style>{`
        @keyframes nexus-pop-in {
          0% { opacity: 0; transform: scale(.5) rotate(-4deg) }
          22% { opacity: 1; transform: scale(1.08) rotate(3deg) }
          70% { opacity: .9 }
          100% { opacity: 0; transform: scale(1.02) rotate(3deg) translateY(-16px) }
        }
      `}</style>
    </div>
  )
}

/** 横向长廊:垂直滚轮驱动,作品大卡横向滑过(sticky 视口) */
export function HorizontalGallery({ works, onOpen }: { works: WorkItem[]; onOpen: (i: number) => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return
    const update = () => {
      const rect = section.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, total)))
      const dist = Math.max(0, track.scrollWidth - window.innerWidth + 80)
      track.style.transform = `translateX(${(-dist * p).toFixed(1)}px)`
      if (barRef.current) barRef.current.style.width = `${(p * 100).toFixed(1)}%`
    }
    // 轮询式更新:不依赖 scroll 事件(部分环境不派发给监听器)
    update()
    const timer = window.setInterval(update, 120)
    window.addEventListener('resize', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', update)
    }
  }, [works.length])

  return (
    <section ref={sectionRef} className="relative" style={{ height: `calc(180vh + ${Math.min(works.length, 6) * 120}px)` }}>
      <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-6 w-full max-w-6xl px-6 md:px-10">
          <p className="font-mono text-[10px] tracking-[0.35em] text-black/40">GALLERY · 横向长廊(继续滚动 →)</p>
          <div className="mt-3 h-px w-full bg-black/10">
            <div ref={barRef} className="h-full bg-black/50 transition-[width] duration-100" style={{ width: '0%' }} />
          </div>
        </div>
        <div
          ref={trackRef}
          className="flex w-max gap-6 pl-6 will-change-transform md:pl-10"
        >
          {works.map((w, i) => (
            <button
              key={w.id}
              onClick={() => onOpen(i)}
              data-cursor="VIEW"
              className="group relative h-[54vh] w-[72vw] shrink-0 cursor-pointer overflow-hidden rounded-3xl border border-black/10 shadow-[0_24px_70px_rgba(20,22,26,0.18)] md:h-[58vh] md:w-[30rem]"
            >
              {w.images[0] ? (
                <img src={w.images[0]} alt={w.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl">🖼️</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-5 pt-12 pb-4 text-left">
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>{w.title}</p>
                <p className="text-[11px] text-white/70">{w.category}{w.year && ` · ${w.year}`}</p>
              </div>
            </button>
          ))}
          <div className="flex h-[54vh] w-[60vw] shrink-0 items-center justify-center md:h-[58vh] md:w-72">
            <p className="rotate-90 font-mono text-[10px] tracking-[0.4em] text-black/35 whitespace-nowrap">SCROLL ON ↓</p>
          </div>
        </div>
      </div>
    </section>
  )
}
