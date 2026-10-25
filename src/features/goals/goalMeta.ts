import type { Goal, Task } from '@/lib/data/types'
import { activeTasks } from '@/stores/taskStore'
import { daysUntil } from '@/stores/milestoneStore'

/** 目标配色展示样式(与习惯 5 色一致) */
export const GOAL_COLOR_META: Record<Goal['color'], { dot: string; tint: string; text: string; stroke: string }> = {
  cyan: { dot: 'bg-cyan-400', tint: 'bg-cyan-400/10', text: 'text-cyan-300', stroke: '#22d3ee' },
  violet: { dot: 'bg-violet-400', tint: 'bg-violet-400/10', text: 'text-violet-300', stroke: '#a78bfa' },
  emerald: { dot: 'bg-emerald-400', tint: 'bg-emerald-400/10', text: 'text-emerald-300', stroke: '#34d399' },
  amber: { dot: 'bg-amber-400', tint: 'bg-amber-400/10', text: 'text-amber-300', stroke: '#fbbf24' },
  rose: { dot: 'bg-rose-400', tint: 'bg-rose-400/10', text: 'text-rose-300', stroke: '#fb7185' },
}

export interface GoalProgress {
  /** 0-100 */
  percent: number
  /** auto 模式:已完成/总数 */
  done: number
  total: number
}

/** 计算目标进度:auto = 按 #标签 关联任务统计;manual = 手动值 */
export function progressOf(goal: Goal, allTasks: Task[]): GoalProgress {
  if (goal.mode === 'manual') {
    return { percent: Math.max(0, Math.min(100, goal.manualProgress)), done: 0, total: 0 }
  }
  if (!goal.tag) return { percent: 0, done: 0, total: 0 }
  const linked = activeTasks(allTasks).filter((t) => t.tags.includes(goal.tag!))
  const done = linked.filter((t) => t.status === 'done').length
  return {
    percent: linked.length === 0 ? 0 : Math.round((done / linked.length) * 100),
    done,
    total: linked.length,
  }
}

/** 目标截止提示 */
export function goalDeadlineLabel(goal: Goal): { text: string; tone: string } | null {
  if (!goal.deadline) return null
  const days = daysUntil(goal.deadline)
  if (days === 0) return { text: '今天到期', tone: 'text-danger' }
  if (days === 1) return { text: '明天到期', tone: 'text-warn' }
  if (days > 1) return { text: `还剩 ${days} 天`, tone: 'text-txt-muted' }
  return { text: `已过期 ${-days} 天`, tone: 'text-danger' }
}
