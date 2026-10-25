import { useEffect, useMemo, useState } from 'react'
import { Camera, Pencil, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ScrambleText, CountUp, Reveal } from '@/components/fx/micro'
import { cn, todayStr } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { useMemoStore } from '@/stores/memoStore'
import { useHabitStore } from '@/stores/habitStore'

/**
 * 海员证 · 个人档案(「一封写给访客的自我介绍信」):
 * 大字名字 + 身份标签链 + 头像 + 一句话介绍 +「现在」活数据 +
 * 兴趣标签墙(hover 展开一句话)+ 联系方式。
 * 编辑模式:全部字段可改,存 localStorage;头像上传压缩 dataURL。
 */

const LS = 'nexus-profile-v1'
const SERIF = 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif'

interface Profile {
  name: string
  tagline: string
  roles: string[]
  avatar: string
  interests: { label: string; note: string }[]
  email: string
  socials: { label: string; url: string }[]
}

const DEFAULT_PROFILE: Profile = {
  name: '海员 001',
  tagline: '在数字海洋里下潜的人。',
  roles: ['创造者', '深度专注爱好者', '数字收藏家'],
  avatar: '',
  interests: [
    { label: '🌊 下潜', note: '每天往深处多潜一米' },
    { label: '🍅 番茄', note: '攒了一排排的时间罐头' },
    { label: '💡 碎碎念', note: '想法转瞬即逝,记下来就是永恒' },
    { label: '🐋 鲸', note: '深海里最安静的邻居' },
    { label: '✨ 徽章', note: '每一枚都是一次第一次' },
    { label: '📮 手帐', note: '海面之上,晒晒太阳写写字' },
  ],
  email: 'hello@nexus.work',
  socials: [
    { label: 'GitHub', url: 'https://github.com' },
  ],
}

function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) ?? 'null') as Partial<Profile> | null
    if (!raw) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...raw }
  } catch {
    return DEFAULT_PROFILE
  }
}

/** 头像压缩 */
function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 240
        const scale = Math.min(1, size / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = String(reader.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function AboutView() {
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Profile>(profile)

  const tasks = useTaskStore((st) => st.tasks)
  const memos = useMemoStore((st) => st.memos)
  const habits = useHabitStore((st) => st.habits)

  useEffect(() => {
    const t = useTaskStore.getState()
    if (!t.loaded) void t.fetch()
    const m = useMemoStore.getState()
    if (!m.loaded) void m.fetch()
    const h = useHabitStore.getState()
    if (!h.loaded) void h.fetch()
  }, [])

  const save = (next: Partial<Profile>) => {
    setProfile((p) => {
      const merged = { ...p, ...next }
      localStorage.setItem(LS, JSON.stringify(merged))
      return merged
    })
  }

  const startEdit = () => {
    setDraft(profile)
    setEditMode(true)
  }
  const applyEdit = () => {
    save(draft)
    setEditMode(false)
  }

  // 「现在」:活着的自我介绍
  const now = useMemo(() => {
    const today = todayStr()
    const todayTodos = tasks.filter((t) => t.status !== 'done' && !t.deletedAt && t.dueDate === today).length
    const doneTotal = tasks.filter((t) => t.status === 'done' && !t.deletedAt).length
    const checkedToday = habits.filter((h) => (h.dates ?? []).includes(today)).length
    const lastMemo = memos[0]
    return { todayTodos, doneTotal, checkedToday, habitTotal: habits.length, lastMemo }
  }, [tasks, memos, habits])

  const setDraftField = (patch: Partial<Profile>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 头部:头像 + 大字名字 + 标签链 */}
      <Reveal>
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {/* 头像 */}
            <div className="relative shrink-0">
              <div className="neon-gradient-bg flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl text-3xl font-bold text-white">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  profile.name.slice(0, 1)
                )}
              </div>
              {editMode && (
                <label className="absolute -right-2 -bottom-2 cursor-pointer rounded-xl border border-line-2 bg-surface-1 p-1.5 text-txt-muted transition-colors hover:border-accent hover:text-accent" title="换头像">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (f) setDraftField({ avatar: await fileToAvatar(f) })
                    }}
                  />
                </label>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {editMode ? (
                <input
                  value={draft.name}
                  onChange={(e) => setDraftField({ name: e.target.value })}
                  className="w-full bg-transparent text-4xl font-bold outline-none md:text-5xl"
                  style={{ fontFamily: SERIF }}
                  placeholder="你的名字"
                />
              ) : (
                <h1 className="text-4xl font-bold tracking-wide md:text-5xl" style={{ fontFamily: SERIF }}>
                  <ScrambleText text={profile.name} delay={250} />
                </h1>
              )}
              {editMode ? (
                <input
                  value={draft.tagline}
                  onChange={(e) => setDraftField({ tagline: e.target.value })}
                  className="mt-2 w-full bg-transparent text-sm outline-none text-txt-muted"
                  placeholder="一句话介绍自己"
                />
              ) : (
                <p className="mt-2 text-sm text-txt-muted">{profile.tagline}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(editMode ? draft.roles : profile.roles).map((r, i) => (
                  <span key={i} className="group/role relative">
                    <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-[11px] text-accent">
                      {r}
                    </span>
                    {editMode && (
                      <button
                        onClick={() => setDraftField({ roles: draft.roles.filter((_, j) => j !== i) })}
                        className="absolute -top-1.5 -right-1.5 cursor-pointer rounded-full bg-surface-3 p-0.5 text-txt-muted hover:text-danger"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {editMode && (
                  <input
                    placeholder="+ 身份"
                    className="w-20 rounded-full border border-dashed border-line-2 bg-transparent px-3 py-1 text-[11px] outline-none placeholder:text-txt-muted/60"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        setDraftField({ roles: [...draft.roles, e.currentTarget.value.trim()] })
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                )}
              </div>
            </div>
            <button
              onClick={() => (editMode ? applyEdit() : startEdit())}
              className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors',
                editMode ? 'border-accent bg-accent text-white' : 'border-line-2 text-txt-muted hover:border-accent hover:text-accent',
              )}
            >
              <Pencil size={13} /> {editMode ? '保存' : '编辑'}
            </button>
          </div>
        </Card>
      </Reveal>

      {/* 现在:活着的自我介绍 */}
      <Reveal delay={100}>
        <Card>
          <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-txt-muted">NOW · 现在</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-mono text-3xl font-bold text-accent"><CountUp value={now.doneTotal} /></p>
              <p className="mt-1 text-[11px] text-txt-muted">件任务已完成</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-accent"><CountUp value={now.todayTodos} /></p>
              <p className="mt-1 text-[11px] text-txt-muted">件今日待办</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-accent"><CountUp value={now.checkedToday} /><span className="text-base text-txt-muted">/{now.habitTotal}</span></p>
              <p className="mt-1 text-[11px] text-txt-muted">今日习惯打卡</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-accent"><CountUp value={memos.length} /></p>
              <p className="mt-1 text-[11px] text-txt-muted">条碎碎念</p>
            </div>
          </div>
          {now.lastMemo && (
            <div className="mt-5 rounded-xl border border-line-1 bg-surface-1 px-4 py-3">
              <p className="text-[10px] tracking-[0.25em] text-txt-muted">最近一条碎碎念</p>
              <p className="mt-1.5 line-clamp-2 text-sm text-txt-secondary">{now.lastMemo.content}</p>
            </div>
          )}
        </Card>
      </Reveal>

      {/* 兴趣标签墙:hover 展开一句话 */}
      <Reveal delay={180}>
        <Card>
          <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-txt-muted">INTERESTS · 打捞上来的东西</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.interests.map((it, i) => (
              <div
                key={i}
                className="group/int rounded-2xl border border-line-1 bg-surface-1 px-4 py-3.5 transition-all duration-300 hover:border-accent/50 hover:bg-accent-soft/30"
              >
                <p className="text-sm font-semibold text-txt-primary">{it.label}</p>
                <p className="mt-1 max-h-0 overflow-hidden text-xs leading-relaxed text-txt-muted opacity-0 transition-all duration-300 group-hover/int:max-h-12 group-hover/int:opacity-100">
                  {it.note}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* 联系方式 */}
      <Reveal delay={260}>
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.3em] text-txt-muted">CONTACT · 见字如面</p>
            {editMode ? (
              <input
                value={draft.email}
                onChange={(e) => setDraftField({ email: e.target.value })}
                className="w-64 rounded-lg border border-line-2 bg-surface-1 px-3 py-2 text-sm outline-none"
                placeholder="你的邮箱"
              />
            ) : (
              <a href={`mailto:${profile.email}`} className="text-lg font-semibold text-accent transition-opacity hover:opacity-75" style={{ fontFamily: SERIF }}>
                {profile.email}
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(editMode ? draft.socials : profile.socials).map((s, i) => editMode ? (
              <input
                key={i}
                value={s.label}
                onChange={(e) => setDraftField({ socials: draft.socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                className="w-24 rounded-lg border border-line-2 bg-surface-1 px-3 py-2 text-xs outline-none"
              />
            ) : (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-2 px-4 py-2 text-xs text-txt-secondary transition-colors hover:border-accent hover:text-accent"
              >
                {s.label} ↗
              </a>
            ))}
          </div>
        </Card>
      </Reveal>

      <p className="pb-4 text-center font-mono text-[10px] tracking-[0.3em] text-txt-muted/50">
        THIS IS ME · 感谢潜到我的海里来
      </p>
    </div>
  )
}
