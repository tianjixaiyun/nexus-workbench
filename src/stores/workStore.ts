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

export const useWorkStore = create<WorkState>((set, get) => ({
  works: [],
  loaded: false,

  async fetch() {
    try {
      const works = await dataAdapter.works.list()
      set({ works, loaded: true })
    } catch (err) {
      console.error('加载作品失败:', err)
      set({ works: [], loaded: true })
    }
  },

  async add(input) {
    const work = await dataAdapter.works.create(input)
    set({ works: [work, ...get().works] })
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
    set({ works: [], loaded: false })
  },
}))
