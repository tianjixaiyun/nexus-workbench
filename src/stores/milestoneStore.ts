import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
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

const fetchGuard = createStoreFetchGuard()

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().milestones, () => get().milestones)
    try {
      request.assertReady()
      const rows = await dataAdapter.milestones.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { milestones: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('倒数日', error)
    }
  },

  async add(input) {
    const milestone = await dataAdapter.milestones.create(input)
    set({ milestones: insertCreatedById(get().milestones, milestone) })
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
    fetchGuard.reset()
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
