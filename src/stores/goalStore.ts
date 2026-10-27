import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Goal, NewGoal } from '@/lib/data/types'

interface GoalState {
  goals: Goal[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewGoal) => Promise<void>
  update: (id: string, patch: Partial<Goal>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().goals, () => get().goals)
    try {
      request.assertReady()
      const rows = await dataAdapter.goals.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { goals: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('目标', error)
    }
  },

  async add(input) {
    const goal = await dataAdapter.goals.create(input)
    set({ goals: insertCreatedById(get().goals, goal) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.goals.update(id, patch)
    set({ goals: get().goals.map((g) => (g.id === id ? updated : g)) })
  },

  async remove(id) {
    await dataAdapter.goals.remove(id)
    set({ goals: get().goals.filter((g) => g.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ goals: [], loaded: false })
  },
}))
