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

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loaded: false,

  async fetch() {
    try {
      const habits = await dataAdapter.habits.list()
      set({ habits, loaded: true })
    } catch (err) {
      console.error('加载习惯失败:', err)
      set({ habits: [], loaded: true })
    }
  },

  async add(input) {
    const habit = await dataAdapter.habits.create(input)
    set({ habits: [...get().habits, habit] })
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
    set({ habits: [], loaded: false })
  },
}))
