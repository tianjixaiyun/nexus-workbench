import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { WorkItem, NewWork } from '@/lib/data/types'

interface WorkState {
  works: WorkItem[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewWork) => Promise<void>
  update: (id: string, patch: Partial<WorkItem>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useWorkStore = create<WorkState>((set, get) => ({
  works: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().works, () => get().works)
    try {
      request.assertReady()
      const rows = await dataAdapter.works.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { works: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('作品', error)
    }
  },

  async add(input) {
    const work = await dataAdapter.works.create(input)
    set({ works: insertCreatedById(get().works, work, true) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.works.update(id, patch)
    set({ works: get().works.map((w) => (w.id === id ? updated : w)) })
  },

  async remove(id) {
    await dataAdapter.works.remove(id)
    set({ works: get().works.filter((w) => w.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ works: [], loaded: false })
  },
}))
