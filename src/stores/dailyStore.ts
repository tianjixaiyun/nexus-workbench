import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
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

const fetchGuard = createStoreFetchGuard()

export const useDailyStore = create<DailyState>((set, get) => ({
  dailies: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().dailies, () => get().dailies)
    try {
      request.assertReady()
      const rows = await dataAdapter.dailies.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { dailies: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('每日复盘', error)
    }
  },

  async upsert(date, mood, note) {
    const existing = get().dailies.find((d) => d.date === date)
    if (existing) {
      const updated = await dataAdapter.dailies.update(existing.id, note === undefined ? { mood } : { mood, note })
      set({ dailies: get().dailies.map((d) => (d.id === updated.id ? updated : d)) })
    } else {
      const created = await dataAdapter.dailies.create({ date, mood, note: note ?? '' })
      set({ dailies: insertCreatedById(get().dailies, created) })
    }
  },

  reset() {
    fetchGuard.reset()
    set({ dailies: [], loaded: false })
  },
}))

export function todayMood(dailies: Daily[]): Daily | undefined {
  return moodOfDate(dailies, todayStr())
}
