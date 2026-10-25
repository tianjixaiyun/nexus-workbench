import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { MOODS } from '@/lib/data/types'
import { isoToLocalDateStr } from '@/lib/utils'
import { loadHistory } from '@/lib/pomodoro'
import { useDailyStore } from '@/stores/dailyStore'
import { useHabitStore, streakOf } from '@/stores/habitStore'
import { activeNotes, useNoteStore } from '@/stores/noteStore'
import { activeTasks, useTaskStore } from '@/stores/taskStore'

/**
 * 我的年度报告(Wrapped 风格):一键生成全屏数据报告。
 * 数据全部本地计算,纯展示,不写库。
 */

function StatBlock({ num, unit, label, big }: { num: string | number; unit?: string; label: string; big?: boolean }) {
  return (
    <div className="text-center">
      <p className={cnNum(big)}>
        {num}
        {unit && <span className="ml-1 text-xl font-medium opacity-80">{unit}</span>}
      </p>
      <p className="mt-1 text-sm text-white/70">{label}</p>
    </div>
  )
}

function cnNum(big?: boolean) {
  return `neon-gradient-text font-bold tracking-tight tabular-nums ${big ? 'text-7xl' : 'text-5xl'}`
}

export function WrappedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allTasks = useTaskStore((s) => s.tasks)
  const notes = useNoteStore((s) => s.notes)
  const habits = useHabitStore((s) => s.habits)
  const dailies = useDailyStore((s) => s.dailies)

  const report = useMemo(() => {
    const tasks = activeTasks(allTasks)
    const done = tasks.filter((t) => t.status === 'done')
    const total = tasks.length
    const rate = total ? Math.round((done.length / total) * 100) : 0
    const focusMinutes = tasks.reduce((s, t) => s + (t.focusMinutes ?? 0), 0) + Object.values(loadHistory()).reduce((a, b) => a + b, 0) * 25

    // 最勤的一天:按完成时间分布
    const byDay = new Map<string, number>()
    for (const t of done) {
      if (!t.completedAt) continue
      const key = isoToLocalDateStr(t.completedAt)
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    let bestDay = '—'
    let bestCount = 0
    for (const [k, v] of byDay) {
      if (v > bestCount) {
        bestCount = v
        bestDay = k
      }
    }

    const bestStreak = habits.reduce((max, h) => Math.max(max, streakOf(h)), 0)
    const topTag = (() => {
      const count = new Map<string, number>()
      for (const t of tasks) for (const tag of t.tags) count.set(tag, (count.get(tag) ?? 0) + 1)
      let top: string | null = null
      let n = 0
      for (const [k, v] of count) if (v > n) ((n = v), (top = k))
      return top
    })()

    const moods = dailies.map((d) => d.mood)
    const moodAvg = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null
    const moodEmoji = moodAvg === null ? '尚未记录' : MOODS[Math.min(4, Math.max(0, Math.round(moodAvg) - 1))].emoji

    const title = rate >= 80 ? '自律大师' : rate >= 50 ? '节奏大师' : total === 0 ? '探索者' : '潜力股'

    return {
      total,
      done: done.length,
      rate,
      focusMinutes,
      bestDay: bestDay === '—' ? '—' : `${Number(bestDay.slice(5, 7))} 月 ${Number(bestDay.slice(8, 10))} 日`,
      bestCount,
      bestStreak,
      notes: activeNotes(notes).length,
      habits: habits.length,
      topTag,
      moodEmoji,
      title,
    }
  }, [allTasks, notes, habits, dailies])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-gradient-to-b from-[#0b1020] via-[#141031] to-[#05080f]">
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-10 cursor-pointer rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="关闭报告"
      >
        <X size={18} />
      </button>

      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-10 px-6 py-20 text-center">
        <div>
          <p className="text-sm tracking-[0.4em] text-white/50">NEXUS · 我的报告</p>
          <h2 className="neon-gradient-text mt-3 text-6xl font-black tracking-wide">{report.title}</h2>
          <p className="mt-3 text-sm text-white/60">这是你在 NEXUS 里留下的全部足迹</p>
        </div>

        <div className="glass-card w-full p-8">
          <StatBlock num={report.total} label="创建的任务" big />
          <div className="mt-8 grid grid-cols-2 gap-8">
            <StatBlock num={report.done} label="已完成" />
            <StatBlock num={`${report.rate}%`} label="完成率" />
          </div>
        </div>

        <div className="glass-card w-full p-8">
          <StatBlock num={report.focusMinutes} unit="分钟" label="累计专注" big />
          <p className="mt-2 text-sm text-white/50">
            ≈ {(report.focusMinutes / 60).toFixed(1)} 小时的深度工作
          </p>
        </div>

        <div className="glass-card w-full p-8">
          <div className="grid grid-cols-3 gap-6">
            <StatBlock num={report.bestStreak} unit="天" label="最长连击" />
            <StatBlock num={report.notes} label="便签" />
            <StatBlock num={report.habits} label="习惯" />
          </div>
        </div>

        <div className="w-full space-y-3 text-sm text-white/80">
          <p className="glass-card rounded-2xl px-5 py-4">
            🏆 状态最好的一天:<span className="font-bold text-white">{report.bestDay}</span>
            {report.bestCount > 0 && <span className="text-white/60">(那天完成了 {report.bestCount} 个任务)</span>}
          </p>
          <p className="glass-card rounded-2xl px-5 py-4">
            {report.moodEmoji} 心情记录:
            {report.moodEmoji === '尚未记录'
              ? '还没有打过心情卡,明天试试?'
              : `平均 ${report.moodEmoji}`}
          </p>
          {report.topTag && (
            <p className="glass-card rounded-2xl px-5 py-4">
              🏷️ 你最惦记的事:<span className="font-bold text-white">#{report.topTag}</span>
            </p>
          )}
        </div>

        <p className="neon-gradient-text pb-6 text-lg font-bold">下一年,继续。</p>
      </div>
    </div>,
    document.body,
  )
}
