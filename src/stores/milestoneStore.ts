import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Milestone, NewMilestone } from '@/lib/data/types'

interface MilestoneState {
  milestones: Milestone[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewMilestone) => Promise<void>
  update: (id: string, patch: Partial<Milestone>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  loaded: false,

  async fetch() {
    try {
      const milestones = await dataAdapter.milestones.list()
      set({ milestones, loaded: true })
    } catch (err) {
      console.error('加载倒数日失败:', err)
      set({ milestones: [], loaded: true })
    }
  },

  async add(input) {
    const milestone = await dataAdapter.milestones.create(input)
    set({ milestones: [...get().milestones, milestone] })
  },

  async update(id, patch) {
    const updated = await dataAdapter.milestones.update(id, patch)
    set({ milestones: get().milestones.map((m) => (m.id === id ? updated : m)) })
  },

  async remove(id) {
    await dataAdapter.milestones.remove(id)
    set({ milestones: get().milestones.filter((m) => m.id !== id) })
  },

  reset() {
    set({ milestones: [], loaded: false })
  },
}))

/** 距离目标日期的天数(负数 = 已过去多少天) */
export function daysUntil(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(y, (m ?? 1) - 1, d ?? 1)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
