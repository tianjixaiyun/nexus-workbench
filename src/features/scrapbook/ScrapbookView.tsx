import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Eraser, MapPin, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal, ScrambleText, Magnetic } from '@/components/fx/micro'

/**
 * 海面之上 · 手帐(剪贴簿风彩蛋页,致敬 ryota 的 VibeCoding 个人网页)
 * 深炭纸底 + 噪点纹理;内容都贴在「拟物 OS 窗口」里(标题栏三圆点,可拖拽);
 * 拍立得照片、荧光胶带、手写体便签、贴纸轻微旋转;底部是本地留言板。
 */

const SERIF = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif'
const HAND = '"Comic Sans MS", "Ink Free", "Segoe Print", "PingFang SC", cursive'
const LS_GUESTBOOK = 'nexus-guestbook'
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`

// ---------- 拟物 OS 窗口(可拖拽) ----------
function OSWindow({ title, children, className, style, tint = '#1c1a17' }: {
  title: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  tint?: string
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const onBarDown = (e: React.PointerEvent) => {
    const el = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    dragRef.current = { dx: e.clientX - el.left, dy: e.clientY - el.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onBarMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy })
  }
  const onBarUp = () => { dragRef.current = null }

  return (
    <div
      className={cn('absolute rounded-xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.55)]', className)}
      style={{
        ...(pos ? { left: pos.x, top: pos.y } : style),
        background: tint,
        backgroundImage: NOISE,
      }}
    >
      {/* 标题栏 */}
      <div
        onPointerDown={onBarDown}
        onPointerMove={onBarMove}
        onPointerUp={onBarUp}
        className="flex cursor-grab items-center gap-2 rounded-t-xl border-b border-white/10 bg-white/[0.045] px-3 py-2 select-none active:cursor-grabbing"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate font-mono text-[11px] text-white/55">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/** 荧光胶带 */
function Tape({ className, color = 'rgba(250,240,130,0.75)' }: { className?: string; color?: string }) {
  return (
    <span
      className={cn('pointer-events-none absolute h-6 w-24 rounded-[2px] shadow-sm', className)}
      style={{ background: color, backdropFilter: 'blur(1px)' }}
    />
  )
}

/** 拍立得照片 */
function Polaroid({ caption, rotate, className, children }: { caption: string; rotate: number; className?: string; children?: ReactNode }) {
  return (
    <div
      className={cn('relative bg-[#f4f0e6] p-2.5 pb-10 shadow-[0_16px_36px_rgba(0,0,0,0.5)]', className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="flex h-32 w-44 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f2b45] via-[#134a6b] to-[#0a1a2c]">
        {children}
      </div>
      <p className="mt-2 text-center text-[12px] text-[#3a352c]" style={{ fontFamily: HAND }}>{caption}</p>
      <Tape className="-top-2.5 left-1/2 -translate-x-1/2 -rotate-3" />
    </div>
  )
}

// ---------- 留言板 ----------
interface GuestEntry {
  id: string
  name: string
  text: string
  at: string
}

function loadEntries(): GuestEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_GUESTBOOK) ?? '[]') as GuestEntry[]
  } catch {
    return []
  }
}

function Guestbook() {
  const [entries, setEntries] = useState<GuestEntry[]>(loadEntries)
  const [name, setName] = useState('')
  const [text, setText] = useState('')

  const submit = () => {
    const t = text.trim()
    if (!t) return
    const next = [
      { id: String(Date.now()), name: name.trim() || '匿名访客', text: t.slice(0, 120), at: new Date().toISOString() },
      ...entries,
    ].slice(0, 30)
    setEntries(next)
    localStorage.setItem(LS_GUESTBOOK, JSON.stringify(next))
    setText('')
  }

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字(可留空)"
          className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-yellow-200/60 sm:w-40"
        />
        <div className="flex flex-1 gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="写点什么贴在这儿…"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30 focus:border-yellow-200/60"
          />
          <button
            onClick={submit}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-yellow-200/85 px-4 py-2 text-sm font-bold text-[#2b2410] transition-transform hover:scale-[1.04]"
          >
            <Send size={14} /> 贴上
          </button>
        </div>
      </div>
      <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
        {entries.length === 0 && (
          <p className="py-4 text-center text-xs text-white/35">还没有留言——成为第一个在海滩上写字的人 ✍️</p>
        )}
        {entries.map((g, i) => (
          <div
            key={g.id}
            className="relative rounded-md border border-white/10 bg-[#f4f0e6]/95 px-3.5 py-2.5 text-[#3a352c] shadow-md"
            style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
          >
            <p className="text-[13px]" style={{ fontFamily: HAND }}>{g.text}</p>
            <p className="mt-1 text-right font-mono text-[10px] text-[#8a8272]">—— {g.name} · {fmt(g.at)}</p>
            {i % 4 === 0 && <Tape className="-top-2.5 right-6 rotate-2 w-16" color="rgba(160,235,255,0.65)" />}
          </div>
        ))}
      </div>
      {entries.length > 0 && (
        <button
          onClick={() => {
            if (confirm('清空全部留言?')) {
              setEntries([])
              localStorage.removeItem(LS_GUESTBOOK)
            }
          }}
          className="flex cursor-pointer items-center gap-1 text-[11px] text-white/35 transition-colors hover:text-white/70"
        >
          <Eraser size={12} /> 清空留言
        </button>
      )}
    </div>
  )
}

// ---------- 主页面 ----------
const FOOTSTEPS = [
  { year: '2026 · 秋', text: '搭起这座数字海洋:下潜的首页、云鲸、手帐和作品集。', sticker: '🌊' },
  { year: '2026 · 夏', text: '开始用 NEXUS 管理任务与专注,第一个番茄、第一枚徽章。', sticker: '🍅' },
  { year: '某一天', text: '决定把生活过成一本可以翻的手帐,而不是一张待办清单。', sticker: '📌' },
]

export default function ScrapbookView() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-[#171512] text-white/90"
      style={{ backgroundImage: NOISE, backgroundBlendMode: 'overlay' }}
    >
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#171512]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button onClick={() => navigate('/')} className="flex cursor-pointer items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-200/85 text-xs font-bold text-[#2b2410]">N</span>
            <span className="font-mono text-sm tracking-[0.2em]">SURFACE · 手帐</span>
          </button>
          <div className="flex items-center gap-2">
            <Magnetic>
              <button onClick={() => navigate('/portfolio')} className="cursor-pointer rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 transition-colors hover:border-white/50">
                作品集
              </button>
            </Magnetic>
            <Magnetic>
              <button onClick={() => navigate('/home')} className="cursor-pointer rounded-full bg-yellow-200/85 px-4 py-2 text-xs font-bold text-[#2b2410] transition-transform hover:scale-[1.04]">
                潜回工作台 ↓
              </button>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* 标题 */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6 md:px-10">
        <p className="font-mono text-xs tracking-[0.35em] text-yellow-200/70">
          <ScrambleText text="ABOVE THE SEA · SCRAPBOOK" delay={200} />
        </p>
        <h1 className="mt-5 text-5xl font-bold tracking-wide md:text-7xl" style={{ fontFamily: SERIF }}>
          海面之上,
          <br />
          是一本<span className="text-yellow-200">手帐</span>。
        </h1>
        <Tape className="mt-4 ml-2 w-32 rotate-[-2deg]" />
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
          潜得再深,也要记得浮上来晒晒太阳。这一页贴着关于我、几枚足迹,和路过的你留下的字条。
        </p>
      </section>

      {/* 窗口们:桌面端散落布局,移动端顺排 */}
      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <div className="relative grid gap-10 md:grid-cols-2 md:gap-6">
          {/* 关于我窗口 */}
          <Reveal className="md:relative md:h-[340px]">
            <OSWindow
              title="about_me.txt"
              className="relative w-full md:absolute md:left-0 md:top-2 md:w-[58%]"
              style={{ transform: 'rotate(-1.2deg)' }}
            >
              <p className="text-3xl font-bold" style={{ fontFamily: SERIF }}>你好,我在这儿。</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                白天潜进数字海洋打理任务与目标,夜里浮上来拼贴这本手帐。
                相信工具可以很美,美也可以很有用——这个网站是我给自己造的小世界。
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {['✍️ 写字的人', '🌊 数字海洋园丁', '🍅 番茄收藏家', '🌙 深海访客'].map((t) => (
                  <span key={t} className="rounded-full border border-yellow-200/25 bg-yellow-200/10 px-3 py-1 text-yellow-100/80">{t}</span>
                ))}
              </div>
            </OSWindow>
            {/* 拍立得 */}
            <Polaroid caption="我的海 & 我的鲸" rotate={3.4} className="absolute top-24 right-0 hidden md:block">
              <div className="text-center">
                <p className="text-4xl">🐋</p>
                <p className="mt-2 font-mono text-[10px] text-cyan-200/80">depth -27m</p>
              </div>
            </Polaroid>
          </Reveal>

          {/* 足迹窗口 */}
          <Reveal delay={120} className="md:relative md:h-[360px]">
            <OSWindow
              title="footprints.log"
              tint="#1a1916"
              className="relative w-full md:absolute md:right-0 md:top-8 md:w-[80%]"
              style={{ transform: 'rotate(1deg)' }}
            >
              <p className="mb-4 flex items-center gap-2 font-mono text-[11px] tracking-[0.25em] text-white/45">
                <MapPin size={12} className="text-yellow-200/70" /> 足迹时间线
              </p>
              <div className="space-y-5">
                {FOOTSTEPS.map((f) => (
                  <div key={f.year} className="flex gap-3.5">
                    <span className="mt-0.5 text-xl">{f.sticker}</span>
                    <div className="min-w-0 border-l border-white/12 pl-3.5">
                      <p className="font-mono text-[11px] text-yellow-200/70">{f.year}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/75">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Tape className="-bottom-2.5 left-8 w-20" color="rgba(240,166,216,0.6)" />
            </OSWindow>
          </Reveal>

          {/* 留言板窗口(全宽) */}
          <Reveal delay={200} className="md:relative md:col-span-2 md:h-[360px]">
            <OSWindow
              title="guestbook — 沙滩字条"
              tint="#1c1a17"
              className="relative w-full md:absolute md:left-[6%] md:top-6 md:w-[70%]"
              style={{ transform: 'rotate(-0.6deg)' }}
            >
              <Guestbook />
            </OSWindow>
            <Polaroid caption="今天也是晴天" rotate={-3} className="absolute right-4 top-40 hidden md:block">
              <div className="text-center">
                <p className="text-4xl">🌤️</p>
                <p className="mt-2 font-mono text-[10px] text-yellow-200/70">sea level · 0m</p>
              </div>
            </Polaroid>
          </Reveal>
        </div>

        <p className="mt-16 text-center font-mono text-[10px] tracking-[0.3em] text-white/30">
          © 2026 NEXUS · TAPED ABOVE THE DIGITAL OCEAN
        </p>
      </section>
    </div>
  )
}
