import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CountUp, Reveal } from '@/components/fx/micro'
import { ACHIEVEMENT_DEFS, loadUnlocked, collectMetrics } from '@/components/fx/achievements'
import { cn } from '@/lib/utils'

/**
 * 成就收藏册:全部徽章的解锁图鉴。
 * 已解锁:彩色徽章 + 解锁日期;未解锁:灰阶 + 锁标识。
 * 顶部进度环 + 四项核心数据(任务/番茄/连续/作品)。
 */
export function AchievementsView() {
  const unlocked = useMemo(() => loadUnlocked(), [])
  const metrics = useMemo(() => {
    try {
      return collectMetrics()
    } catch {
      return { doneTasks: 0, focusTotal: 0, maxStreak: 0, goalDone: false, works: 0, night: false }
    }
  }, [])

  const total = ACHIEVEMENT_DEFS.length
  const got = ACHIEVEMENT_DEFS.filter((a) => unlocked[a.id]).length
  const pct = Math.round((got / total) * 100)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const stats = [
    { label: '完成任务', value: metrics.doneTasks, suffix: '件' },
    { label: '专注番茄', value: metrics.focusTotal, suffix: '个' },
    { label: '最长连续打卡', value: metrics.maxStreak, suffix: '天' },
    { label: '收录作品', value: metrics.works, suffix: '件' },
  ]

  return (
    <div className="space-y-6">
      {/* 进度头卡 */}
      <Card className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-surface-3" />
            <circle
              cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
              className="stroke-accent transition-all duration-1000"
              strokeDasharray={`${(pct / 100) * 264} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-accent">
              <CountUp value={got} duration={800} />/{total}
            </span>
            <span className="text-[10px] text-txt-muted">已解锁</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-wide">成就收藏册</h2>
          <p className="mt-1.5 text-sm text-txt-muted">
            在数字海洋里留下的每一个第一次,都会被记录在这里。解锁 {total} 枚徽章,点亮整片海。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-line-1 bg-surface-1 px-3 py-2.5">
                <p className="font-mono text-lg font-bold tabular-nums">
                  <CountUp value={s.value} duration={900} />
                  <span className="ml-0.5 text-[10px] font-normal text-txt-muted">{s.suffix}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-txt-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 徽章墙 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ACHIEVEMENT_DEFS.map((a, i) => {
          const at = unlocked[a.id]
          const done = Boolean(at)
          return (
            <Reveal key={a.id} delay={i * 60}>
              <Card
                className={cn(
                  'flex h-full items-center gap-4 transition-colors',
                  done ? 'border-accent/30' : 'opacity-70 grayscale',
                )}
              >
                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl',
                    done
                      ? 'bg-gradient-to-br from-sky-400/25 to-cyan-300/25 shadow-[0_0_24px_rgba(103,232,249,0.18)]'
                      : 'bg-surface-3',
                  )}
                >
                  {done ? a.icon : <Lock size={20} className="text-txt-muted" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-bold', done ? 'text-txt-primary' : 'text-txt-muted')}>{a.name}</p>
                  <p className="mt-0.5 text-xs text-txt-muted">{a.desc}</p>
                  <p className={cn('mt-1.5 font-mono text-[10px]', done ? 'text-accent' : 'text-txt-muted/60')}>
                    {done ? `解锁于 ${formatDate(at)}` : '尚未解锁'}
                  </p>
                </div>
              </Card>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
