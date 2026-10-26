import type { Daily, Habit, Task } from './data/types'
import { isoToLocalDateStr, toDateStr } from './utils'

type ReflectionTask = Pick<Task, 'title' | 'status' | 'completedAt' | 'deletedAt'>
type ReflectionHabit = Pick<Habit, 'name' | 'dates'>

export interface WeekStats {
  tasksDone: number
  habitCheckins: number
  focusMinutes: number
  moodAvg: number | null
  days: number
}

/** 以本地日期而非 UTC 切周，周一至今天采用同一统计窗口。 */
export function weekDateKeys(now = new Date()): string[] {
  const days = (now.getDay() + 6) % 7 + 1
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1 + index)
    return toDateStr(date)
  })
}

export function isReflectionDate(date: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T12:00:00`)
  return Number.isFinite(parsed.getTime()) && toDateStr(parsed) === date && date <= toDateStr(now)
}

function completedOn(task: ReflectionTask, keys: Set<string>): boolean {
  return task.status === 'done' && !task.deletedAt && !!task.completedAt &&
    Number.isFinite(new Date(task.completedAt).getTime()) && keys.has(isoToLocalDateStr(task.completedAt))
}

export function summarizeWeek(input: {
  tasks: ReflectionTask[]
  habits: ReflectionHabit[]
  dailies: Pick<Daily, 'date' | 'mood'>[]
  focus: { key: string; minutes: number }[]
}, now = new Date()): WeekStats {
  const keys = new Set(weekDateKeys(now))
  const moods = input.dailies.filter((day) => keys.has(day.date) && day.mood >= 1 && day.mood <= 5).map((day) => day.mood)
  return {
    tasksDone: input.tasks.filter((task) => completedOn(task, keys)).length,
    habitCheckins: input.habits.reduce((sum, habit) => sum + [...new Set(habit.dates ?? [])].filter((date) => keys.has(date)).length, 0),
    focusMinutes: input.focus.reduce((sum, day) => sum + (keys.has(day.key) && Number.isFinite(day.minutes) ? Math.max(0, day.minutes) : 0), 0),
    moodAvg: moods.length ? moods.reduce((sum, mood) => sum + mood, 0) / moods.length : null,
    days: keys.size,
  }
}

/** 只拼装已记录的事实，个人收获与明日计划留给用户填写。 */
export function buildReflectionDraft(input: {
  date: string
  tasks: ReflectionTask[]
  habits: ReflectionHabit[]
  focusMinutes: number
}): string {
  const done = input.tasks.filter((task) => completedOn(task, new Set([input.date])))
  const habits = input.habits.filter((habit) => habit.dates?.includes(input.date))
  const minutes = Number.isFinite(input.focusMinutes) ? Math.max(0, input.focusMinutes) : 0
  const titles = (items: { title: string }[]) => items.slice(0, 3).map((item) => item.title).join('、') + (items.length > 3 ? '等' : '')
  return [
    `完成 ${done.length} 个任务${done.length ? `：${titles(done)}` : ''}。`,
    `习惯打卡 ${habits.length} 次${habits.length ? `：${habits.slice(0, 3).map((habit) => habit.name).join('、')}${habits.length > 3 ? '等' : ''}` : ''}。`,
    `专注 ${minutes} 分钟。`,
  ].join('\n')
}
