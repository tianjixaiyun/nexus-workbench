import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, ArrowUpRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/workStore'
import { seedWorks } from '@/lib/sample'
import type { WorkItem } from '@/lib/data/types'
import { ScrambleText, Magnetic, TiltCard, Reveal } from '@/components/fx/micro'
import { Marquee } from '@/components/fx/bits'

/**
 * 作品集 · 编辑杂志风(浅色纸面,与主站的深色数字海洋形成"翻开画册"的反差)
 * 结构:超大字 Hero → 序号式作品列表(悬浮预览)→ 详情画廊 overlay →
 *      玻璃拟态「关于」→ 超大字页脚 LET'S WORK TOGETHER。
 * 编辑模式:右上角开关,可增删改作品、维护关于文案与联系邮箱(存 localStorage)。
 */

const SERIF = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif'
const LS_ABOUT = 'nexus-portfolio-about'
const LS_EMAIL = 'nexus-portfolio-email'

// ---------- 图片工具:上传压缩为 dataURL ----------
function fileToPoster(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 1400
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = String(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ---------- 编辑弹窗 ----------
interface Draft {
  title: string
  category: string
  year: string
  description: string
  link: string
  images: string[]
}

function WorkEditor({ initial, onClose, onSave }: {
  initial: Draft
  onClose: () => void
  onSave: (draft: Draft) => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const imgs = await Promise.all([...files].slice(0, 6).map(fileToPoster))
    set({ images: [...draft.images, ...imgs].slice(0, 9) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-[#faf8f3] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold" style={{ fontFamily: SERIF }}>{initial.title ? '编辑作品' : '新增作品'}</h3>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <label className="col-span-2 block text-sm">
            <span className="mb-1.5 block font-medium text-black/60">作品名称</span>
            <input
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="例如:数字海洋 · 个人网站"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-black/50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-black/60">分类</span>
            <input
              value={draft.category}
              onChange={(e) => set({ category: e.target.value })}
              placeholder="网页设计 / 三维交互 / 插画…"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-black/50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-black/60">年份</span>
            <input
              value={draft.year}
              onChange={(e) => set({ year: e.target.value })}
              placeholder="2026"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-black/50"
            />
          </label>
          <label className="col-span-2 block text-sm">
            <span className="mb-1.5 block font-medium text-black/60">作品描述</span>
            <textarea
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              placeholder="这个作品是什么、亮点在哪里、给谁看的…"
              className="w-full resize-none rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-black/50"
            />
          </label>
          <label className="col-span-2 block text-sm">
            <span className="mb-1.5 block font-medium text-black/60">外链(可选)</span>
            <input
              value={draft.link}
              onChange={(e) => set({ link: e.target.value })}
              placeholder="https://…"
              className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none focus:border-black/50"
            />
          </label>
          <div className="col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-black/60">作品图片</span>
            <div className="flex flex-wrap gap-3">
              {draft.images.map((src, i) => (
                <div key={i} className="group relative h-20 w-28 overflow-hidden rounded-lg border border-black/10">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => set({ images: draft.images.filter((_, j) => j !== i) })}
                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-black/25 text-black/45 transition-colors hover:border-black/60 hover:text-black/70">
                <Plus size={18} />
                <span className="mt-1 text-[10px]">上传图片</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
              </label>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="cursor-pointer rounded-full border border-black/20 px-6 py-2.5 text-sm text-black/70 transition-colors hover:border-black/60">
            取消
          </button>
          <button
            disabled={!draft.title.trim() || saving}
            onClick={async () => {
              setSaving(true)
              await onSave(draft)
              setSaving(false)
              onClose()
            }}
            className="cursor-pointer rounded-full bg-black px-7 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------- 详情画廊 ----------
function WorkDetail({ work, index, total, onClose, onPrev, onNext }: {
  work: WorkItem
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#f6f4ef]/97 backdrop-blur-xl">
      <div className="flex shrink-0 items-center justify-between px-6 py-4 md:px-10">
        <span className="font-mono text-xs text-black/50">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <button onClick={onClose} className="cursor-pointer rounded-full border border-black/20 p-2 text-black/70 transition-colors hover:border-black/60 hover:text-black">
          <X size={18} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 pb-10 md:flex-row md:px-10">
        {/* 画廊 */}
        <div className="min-w-0 flex-1">
          {work.images.length > 0 ? (
            <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:h-[70vh]">
              {work.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={work.title}
                  className="h-auto max-h-[70vh] w-auto max-w-full shrink-0 snap-center rounded-2xl border border-black/10 object-contain shadow-xl md:h-full"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-[50vh] items-center justify-center rounded-2xl border border-dashed border-black/20 text-black/35">
              无图片
            </div>
          )}
        </div>
        {/* 信息 */}
        <aside className="w-full shrink-0 md:w-80">
          <p className="font-mono text-xs tracking-[0.3em] text-black/45">{work.category || '未分类'} · {work.year || ''}</p>
          <h2 className="mt-3 text-3xl leading-tight font-bold md:text-4xl" style={{ fontFamily: SERIF }}>{work.title}</h2>
          <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap text-black/70">{work.description || '暂无描述'}</p>
          {work.link && (
            <a
              href={work.link}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
            >
              访问作品 <ArrowUpRight size={15} />
            </a>
          )}
          <div className="mt-10 flex items-center justify-between border-t border-black/10 pt-5">
            <button onClick={onPrev} className="cursor-pointer text-sm text-black/60 transition-colors hover:text-black">← 上一件</button>
            <button onClick={onNext} className="cursor-pointer text-sm text-black/60 transition-colors hover:text-black">下一件 →</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ---------- 主页面 ----------
export default function PortfolioView() {
  const navigate = useNavigate()
  const { works, loaded, fetch, add, update, remove } = useWorkStore()
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null)
  const [about, setAbout] = useState(() => localStorage.getItem(LS_ABOUT) ?? '')
  const [email, setEmail] = useState(() => localStorage.getItem(LS_EMAIL) ?? 'hello@nexus.work')
  const [editMeta, setEditMeta] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const watermarkRef = useRef<HTMLDivElement>(null)

  // 页面级视差:巨型水印字以更低速度漂移
  useEffect(() => {
    const onScroll = () => {
      if (watermarkRef.current) {
        watermarkRef.current.style.transform = 'translateY(' + (-scrollY * 0.22) + 'px)'
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!loaded) void fetch()
  }, [loaded, fetch])

  const saveAbout = (text: string) => {
    setAbout(text)
    localStorage.setItem(LS_ABOUT, text)
  }
  const saveEmail = (text: string) => {
    setEmail(text)
    localStorage.setItem(LS_EMAIL, text)
  }

  const detail = detailIndex !== null ? works[detailIndex] : null

  const summary = useMemo(
    () => `${String(works.length).padStart(2, '0')} WORKS · SINCE ${works.length ? Math.min(...works.map((w) => Number(w.year) || 2026)) : 2026}`,
    [works],
  )

  return (
    <div
      className="min-h-dvh bg-[#f6f4ef] text-[#14161a]"
      style={{ fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif' }}
      onMouseMove={(e) => hoverPreview && setHoverPreview((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p))}
    >
      {/* 视差水印:漂在纸面背后的巨型字 */}
      <div
        ref={watermarkRef}
        className="pointer-events-none fixed top-[16%] left-1/2 z-0 -translate-x-1/2 select-none will-change-transform"
        aria-hidden
      >
        <span className="block text-[22vw] leading-none font-bold tracking-tight text-black/[0.035]" style={{ fontFamily: SERIF }}>
          PORTFOLIO
        </span>
      </div>

      {/* 顶栏 */}
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f6f4ef]/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <button onClick={() => navigate('/')} className="flex cursor-pointer items-center gap-2.5" title="回到海洋首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white">N</span>
            <span className="text-sm font-bold tracking-[0.2em]">NEXUS</span>
            <span className="text-[10px] tracking-[0.3em] text-black/45">PORTFOLIO</span>
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setEditMode((v) => !v)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors',
                editMode ? 'border-black bg-black text-white' : 'border-black/20 text-black/70 hover:border-black/60',
              )}
            >
              <Pencil size={13} /> {editMode ? '编辑中' : '编辑'}
            </button>
            <Magnetic>
              <button onClick={() => navigate('/')} className="hidden cursor-pointer rounded-full border border-black/20 px-4 py-2 text-xs text-black/70 transition-colors hover:border-black/60 md:block">
                海洋首页
              </button>
            </Magnetic>
            <Magnetic>
              <button onClick={() => navigate('/home')} className="cursor-pointer rounded-full bg-black px-4 py-2 text-xs text-white transition-transform hover:scale-[1.03]">
                工作台 →
              </button>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-14 md:px-10 md:pt-28">
        <p className="font-mono text-xs tracking-[0.35em] text-black/45"><ScrambleText text={summary} delay={150} /></p>
        <h1 className="mt-6 text-6xl leading-[1.04] font-bold tracking-tight md:text-[7.5rem]" style={{ fontFamily: SERIF }}>
          作品<span className="italic">集</span>
          <span className="mt-3 block text-base font-normal tracking-[0.5em] text-transparent md:text-xl" style={{ WebkitTextStroke: '1.5px rgba(20,22,26,0.55)' }}>
            <ScrambleText text="SELECTED WORKS" delay={600} />
          </span>
        </h1>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-black/60">
          {about || '这里收录我的作品与项目——网页、三维、界面与实验。每一件都是一次向深处下潜。'}
        </p>
      </section>

      {/* 作品列表:序号行式 */}
      <section ref={listRef} className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        {loaded && works.length === 0 && (
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-black/20 py-20">
            <p className="text-sm text-black/50">还没有作品——先放几件示例找找感觉?</p>
            <button
              onClick={() => void seedWorks().then(() => void fetch())}
              className="cursor-pointer rounded-full bg-black px-7 py-3 text-sm text-white transition-transform hover:scale-[1.03]"
            >
              填充示例作品
            </button>
          </div>
        )}
        <div className="border-t border-black/12">
          {works.map((w, i) => (
            <Reveal key={w.id} delay={i * 70}>
            <div
              data-cursor="VIEW"
              className="group relative flex cursor-pointer items-center gap-4 border-b border-black/12 py-7 transition-colors hover:bg-black/[0.03] md:gap-8 md:py-9"
              onMouseEnter={() => w.images[0] && !editMode && setHoverPreview({ src: w.images[0], x: -999, y: -999 })}
              onMouseMove={(e) => w.images[0] && !editMode && setHoverPreview({ src: w.images[0], x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoverPreview(null)}
              onClick={() => (editMode ? setEditing({
                id: w.id,
                draft: { title: w.title, category: w.category, year: w.year, description: w.description, link: w.link, images: [...w.images] },
              }) : setDetailIndex(i))}
            >
              <span className="w-8 shrink-0 font-mono text-sm text-black/40">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-2xl leading-snug font-bold transition-transform duration-300 group-hover:translate-x-2 md:text-4xl" style={{ fontFamily: SERIF }}>
                  {w.title || '未命名'}
                </h3>
                <p className="mt-1.5 text-xs text-black/45">{w.category}{w.year && ` · ${w.year}`}</p>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 text-xs text-black/50 transition-all group-hover:gap-3 group-hover:text-black md:flex">
                {editMode ? '编辑' : 'VIEW'} <ArrowUpRight size={14} />
              </span>
              {editMode && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (confirm(`删除「${w.title}」?`)) await remove(w.id)
                  }}
                  className="shrink-0 cursor-pointer rounded-full border border-black/15 p-2 text-black/50 transition-colors hover:border-red-500 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            </Reveal>
          ))}
        </div>
        {editMode && (
          <button
            onClick={() => setEditing({ id: '', draft: { title: '', category: '', year: String(new Date().getFullYear()), description: '', link: '', images: [] } })}
            className="mt-8 flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-black/30 px-7 py-3.5 text-sm text-black/70 transition-colors hover:border-black hover:text-black"
          >
            <Plus size={16} /> 新增作品
          </button>
        )}
      </section>

      {/* 桌面端:hover 联动的粘性大图预览窗(获奖站式联动) */}
      <div className="pointer-events-none fixed right-[9%] top-1/2 z-20 hidden w-[30rem] -translate-y-1/2 md:block" aria-hidden>
        <div
          className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-black/10 shadow-[0_30px_80px_rgba(20,22,26,0.28)] transition-all duration-500"
          style={{ opacity: hoverPreview && hoverPreview.x > -900 ? 1 : 0, transform: hoverPreview && hoverPreview.x > -900 ? 'rotate(2deg) scale(1)' : 'rotate(4deg) scale(0.92)' }}
        >
          {works.map((w) => (
            <img
              key={w.id}
              src={w.images[0]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              style={{ opacity: hoverPreview && hoverPreview.src === w.images[0] ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>
      </div>

      {/* 悬浮预览(移动端兜底,编辑模式外) */}
      {hoverPreview && hoverPreview.x > -900 && (
        <img
          src={hoverPreview.src}
          alt=""
          className="pointer-events-none fixed z-20 w-64 rotate-2 rounded-xl border border-black/10 shadow-2xl md:hidden"
          style={{ left: Math.min(hoverPreview.x + 24, window.innerWidth - 280), top: hoverPreview.y - 100 }}
        />
      )}

      {/* 大字跑马灯分隔带 */}
      <div className="mx-auto mb-16 max-w-6xl border-y border-black/12 py-4 md:px-10">
        <Marquee
          speed={34}
          className="[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
          items={['网页设计', 'WEB', '三维交互', '3D', '产品设计', 'PRODUCT', '视觉实验', 'EXPERIMENT'].map((t, i) => (
            <span key={i} className="flex items-center gap-4">
              <span className="text-3xl font-bold tracking-wide text-black/80 md:text-5xl" style={{ fontFamily: SERIF }}>{t}</span>
              <span className="text-xl text-black/25 md:text-2xl">✦</span>
            </span>
          ))}
        />
      </div>

      {/* 关于:玻璃卡 */}
      <section className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <TiltCard className="rounded-3xl" max={4}>
        <div className="rounded-3xl border border-white/60 bg-white/55 p-9 shadow-[0_20px_60px_rgba(20,22,26,0.08)] backdrop-blur-xl md:p-14">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-3xl font-bold md:text-5xl" style={{ fontFamily: SERIF }}>关于我</h2>
            {editMode && (
              <button onClick={() => setEditMeta((v) => !v)} className="shrink-0 cursor-pointer rounded-full border border-black/20 px-4 py-1.5 text-xs text-black/60 hover:border-black/60">
                {editMeta ? '完成' : '改这段话'}
              </button>
            )}
          </div>
          {editMode && editMeta ? (
            <textarea
              value={about}
              onChange={(e) => saveAbout(e.target.value)}
              rows={4}
              placeholder="写一段介绍自己的话,访客会在这里认识你…"
              className="mt-6 w-full resize-none rounded-2xl border border-black/15 bg-white px-5 py-4 text-sm leading-relaxed outline-none focus:border-black/50"
            />
          ) : (
            <p className="mt-6 max-w-2xl text-sm leading-loose text-black/70 md:text-base">
              {about || '一名在数字海洋里下潜的创造者。白天管理工作与目标,夜晚打磨界面与光影——相信工具可以很美,美也可以很有用。这个网站是我的自留地:向下的每一米,都算数。'}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-2 text-[11px] text-black/55">
            {['网页设计', '三维交互', '产品设计', '效率工具', '视觉实验'].map((t) => (
              <span key={t} className="rounded-full border border-black/12 bg-white/70 px-3.5 py-1.5">{t}</span>
            ))}
          </div>
        </div>
        </TiltCard>
      </section>

      {/* 页脚:超大字 */}
      <footer className="border-t border-black/10 bg-[#14161a] px-6 py-20 text-[#f6f4ef] md:py-28">
        <div className="mx-auto max-w-6xl md:px-4">
          <h2 className="text-5xl leading-[1.02] font-bold tracking-tight md:text-[6.5rem]" style={{ fontFamily: SERIF }}>
            <span className="nexus-footer-word inline-block">LET'S</span>
            <br />
            <span className="nexus-footer-word inline-block">WORK</span>
            <br />
            <span className="nexus-footer-word inline-block italic">TOGETHER.</span>
          </h2>
          <style>{`
            .nexus-footer-word { transition: color .35s ease, transform .35s cubic-bezier(.2,.9,.3,1.4), text-shadow .35s ease }
            .nexus-footer-word:hover { color: #7ce7ff; transform: skewX(-6deg) scale(1.04); text-shadow: 0 0 40px rgba(124,231,255,.45) }
          `}</style>
          <div className="mt-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.35em] text-white/40">EMAIL</p>
              {editMode ? (
                <input
                  value={email}
                  onChange={(e) => saveEmail(e.target.value)}
                  className="mt-2 w-72 rounded-xl border border-white/25 bg-transparent px-4 py-2.5 text-lg outline-none focus:border-white/70 md:text-2xl"
                  style={{ fontFamily: SERIF }}
                />
              ) : (
                <a href={`mailto:${email}`} className="mt-2 block text-lg md:text-2xl" style={{ fontFamily: SERIF }}>
                  {email}
                </a>
              )}
            </div>
            <div className="flex gap-6 text-sm text-white/60">
              <button onClick={() => navigate('/')} className="cursor-pointer transition-colors hover:text-white">海洋首页</button>
              <button onClick={() => navigate('/sanctuary')} className="cursor-pointer transition-colors hover:text-white">云鲸圣域</button>
              <button onClick={() => navigate('/home')} className="cursor-pointer transition-colors hover:text-white">工作台</button>
            </div>
          </div>
          <div className="mt-14 flex items-center justify-between border-t border-white/12 pt-6 text-[10px] tracking-[0.25em] text-white/35">
            <span>© 2026 NEXUS · PERSONAL PORTFOLIO</span>
            <span className="flex items-center gap-1.5"><ArrowLeft size={11} className="rotate-90" /> DESIGNED IN THE DEEP OCEAN</span>
          </div>
        </div>
      </footer>

      {/* 详情 overlay */}
      {detail && (
        <WorkDetail
          work={detail}
          index={detailIndex!}
          total={works.length}
          onClose={() => setDetailIndex(null)}
          onPrev={() => setDetailIndex((i) => (i === null ? null : (i - 1 + works.length) % works.length))}
          onNext={() => setDetailIndex((i) => (i === null ? null : (i + 1) % works.length))}
        />
      )}

      {/* 编辑 overlay */}
      {editing && (
        <WorkEditor
          initial={editing.draft}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (editing.id) await update(editing.id, draft)
            else await add(draft)
          }}
        />
      )}
    </div>
  )
}
