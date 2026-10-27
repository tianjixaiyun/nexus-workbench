import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Habit, NewHabit } from '@/lib/data/types'
import { todayStr } from '@/lib/utils'

interface HabitState {
  habits: Habit[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewHabit) => Promise<Habit>
  update: (id: string, patch: Partial<Habit>) => Promise<void>
  remove: (id: string) => Promise<void>
  /** 打卡/取消今天的打卡 */
  toggleToday: (id: string) => Promise<void>
  reset: () => void
}

/** 连续打卡天数(含今天或从昨天起算) */
export function streakOf(habit: Habit): number {
  const days = new Set(habit.dates)
  const d = new Date()
  if (!days.has(todayStr())) d.setDate(d.getDate() - 1)
  let streak = 0
  // 最多回看 366 天
  for (let i = 0; i < 366; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!days.has(key)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

/** 累计打卡天数 */
export function totalOf(habit: Habit): number {
  return habit.dates.length
}

const fetchGuard = createStoreFetchGuard()

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().habits, () => get().habits)
    try {
      request.assertReady()
      const rows = await dataAdapter.habits.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { habits: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('习惯', error)
    }
  },

  async add(input) {
    const habit = await dataAdapter.habits.create(input)
    set({ habits: insertCreatedById(get().habits, habit) })
    return habit
  },

  async update(id, patch) {
    const updated = await dataAdapter.habits.update(id, patch)
    set({ habits: get().habits.map((h) => (h.id === id ? updated : h)) })
  },

  async remove(id) {
    await dataAdapter.habits.remove(id)
    set({ habits: get().habits.filter((h) => h.id !== id) })
  },

  async toggleToday(id) {
    const habit = get().habits.find((h) => h.id === id)
    if (!habit) return
    const today = todayStr()
    const dates = habit.dates.includes(today)
      ? habit.dates.filter((d) => d !== today)
      : [...habit.dates, today]
    await get().update(id, { dates })
  },

  reset() {
    fetchGuard.reset()
    set({ habits: [], loaded: false })
  },
}))
