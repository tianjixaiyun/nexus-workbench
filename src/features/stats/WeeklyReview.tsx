import { useEffect, useMemo, useState } from 'react'
import { Moon, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MOODS } from '@/lib/data/types'
import { render } from '@/lib/assistant'
import { cn, todayStr } from '@/lib/utils'
import { recentSessions } from '@/lib/pomodoro'
import { todayMood, useDailyStore } from '@/stores/dailyStore'
import { useHabitStore } from '@/stores/habitStore'
import { useTaskStore } from '@/stores/taskStore'
import { summarizeWeek, weekDateKeys, type WeekStats } from '@/lib/reflection'

export type { WeekStats } from '@/lib/reflection'

export function useWeekStats(): WeekStats {
  const tasks = useTaskStore((s) => s.tasks)
  const habits = useHabitStore((s) => s.habits)
  const dailies = useDailyStore((s) => s.dailies)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('nexus:focus-history', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('nexus:focus-history', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return useMemo(() => summarizeWeek({
    tasks, habits, dailies, focus: recentSessions(weekDateKeys().length),
  }), [tasks, habits, dailies, revision])
}
function moodEmoji(avg: number): string {
  if (avg >= 4.5) return '🤩'
  if (avg >= 3.5) return '😊'
  if (avg >= 2.5) return '😐'
  if (avg >= 1.5) return '😕'
  return '😫'
}

/** 自动生成的本周回顾(Abdaal 式 Weekly Review 的本地统计版) */
export function WeeklyReviewCard() {
  const week = useWeekStats()
  const dailies = useDailyStore((s) => s.dailies)
  const mood = todayMood(dailies)
  const [moodError, setMoodError] = useState('')

  // 评语用提示词模板生成:稳定骨架 + 数据槽位(2026 提示词最佳实践)
  const comment = useMemo(() => {
    const slots = [
      { name: 'done', value: String(week.tasksDone) },
      { name: 'checkins', value: String(week.habitCheckins) },
      { name: 'minutes', value: String(week.focusMinutes) },
    ]
    const variants: string[] = []
    if (week.tasksDone === 0 && week.focusMinutes === 0) {
      variants.push('新的一周,从一个 25 分钟的番茄开始')
    } else {
      if (week.tasksDone >= 10) variants.push('完成了 {{done}} 个任务,高产的一周,记得给自己发奖金')
      else if (week.tasksDone >= 5) variants.push('本周拿下 {{done}} 个任务,节奏很好,继续保持')
      if (week.focusMinutes >= 100) variants.push('累计专注 {{minutes}} 分钟,深度工作的感觉找到了')
      else if (week.habitCheckins >= 5) variants.push('打卡 {{checkins}} 次,习惯正在长成肌肉记忆')
      if (variants.length === 0) variants.push('完成了 {{done}} 个任务、专注 {{minutes}} 分钟,细水长流,推进比完美更重要')
    }
    const template = variants.join(' ')
    return render(template, slots)
  }, [week])

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-txt-secondary">
          <Sparkles size={15} className="text-accent" />
          本周回顾(自动生成)
        </p>
        <span className="text-[11px] text-txt-muted">本周一至今天 · {week.days} 天</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '完成任务', value: week.tasksDone, unit: '个' },
          { label: '习惯打卡', value: week.habitCheckins, unit: '次' },
          { label: '专注时长', value: week.focusMinutes, unit: '分钟' },
          { label: '平均心情', value: week.moodAvg ? week.moodAvg.toFixed(1) : '—', unit: week.moodAvg ? moodEmoji(week.moodAvg) : '' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line-2 bg-surface-1 px-2 py-3 text-center">
            <p className="text-[11px] text-txt-muted">{s.label}</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums">{s.value}</p>
            <p className="text-[10px] text-txt-muted">{s.unit}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-xl border border-line-2 bg-surface-1 px-3 py-2 text-xs leading-relaxed text-txt-secondary">
        💬 {comment}
      </p>

      {moodError && <p role="alert" className="mt-2 text-xs text-danger">{moodError}</p>}
      {/* 顺手把今天的心情也记了 */}
      <div className="mt-3 flex items-center gap-2">
        <Moon size={13} className="shrink-0 text-txt-muted" />
        <span className="shrink-0 text-[11px] text-txt-muted">今天的心情:</span>
        <div className="flex gap-1">
          {MOODS.map((m) => {
            const active = mood?.mood === m.value
            return (
              <button
                key={m.value}
                onClick={() => {
                  setMoodError('')
                  void useDailyStore.getState().upsert(todayStr(), m.value).catch(() => setMoodError('心情未保存，请重试。'))
                }}
                aria-label={m.label}
                aria-pressed={active}
                title={m.label}
                className={cn(
                  'h-7 w-7 cursor-pointer rounded-lg text-sm transition-all',
                  active ? 'bg-accent-soft ring-1 ring-accent' : 'opacity-50 hover:opacity-100',
                )}
              >
                {m.emoji}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
