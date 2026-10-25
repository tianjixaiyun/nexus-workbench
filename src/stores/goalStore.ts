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

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loaded: false,

  async fetch() {
    try {
      const goals = await dataAdapter.goals.list()
      set({ goals, loaded: true })
    } catch (err) {
      console.error('加载目标失败:', err)
      set({ goals: [], loaded: true })
    }
  },

  async add(input) {
    const goal = await dataAdapter.goals.create(input)
    set({ goals: [...get().goals, goal] })
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
    set({ goals: [], loaded: false })
  },
}))
