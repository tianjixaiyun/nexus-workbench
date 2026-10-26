import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Daily } from '@/lib/data/types'
import { todayStr } from '@/lib/utils'

interface DailyState {
  dailies: Daily[]
  loaded: boolean
  fetch: () => Promise<void>
  /** 记录/覆盖某天的心情(每天一条,存在即更新) */
  upsert: (date: string, mood: number, note?: string) => Promise<void>
  reset: () => void
}

export function moodOfDate(dailies: Daily[], date: string): Daily | undefined {
  return dailies.find((d) => d.date === date)
}

export const useDailyStore = create<DailyState>((set, get) => ({
  dailies: [],
  loaded: false,

  async fetch() {
    try {
      const dailies = await dataAdapter.dailies.list()
      set({ dailies, loaded: true })
    } catch (err) {
      console.error('加载每日记录失败:', err)
      set({ dailies: [], loaded: true })
    }
  },

  async upsert(date, mood, note) {
    const existing = get().dailies.find((d) => d.date === date)
    if (existing) {
      const updated = await dataAdapter.dailies.update(existing.id, note === undefined ? { mood } : { mood, note })
      set({ dailies: get().dailies.map((d) => (d.id === updated.id ? updated : d)) })
    } else {
      const created = await dataAdapter.dailies.create({ date, mood, note: note ?? '' })
      set({ dailies: [...get().dailies, created] })
    }
  },

  reset() {
    set({ dailies: [], loaded: false })
  },
}))

export function todayMood(dailies: Daily[]): Daily | undefined {
  return moodOfDate(dailies, todayStr())
}
