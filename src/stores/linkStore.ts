import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { LinkItem, NewLink } from '@/lib/data/types'

interface LinkState {
  links: LinkItem[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewLink) => Promise<void>
  update: (id: string, patch: Partial<LinkItem>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useLinkStore = create<LinkState>((set, get) => ({
  links: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().links, () => get().links)
    try {
      request.assertReady()
      const rows = await dataAdapter.links.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { links: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('书签', error)
    }
  },

  async add(input) {
    const link = await dataAdapter.links.create(input)
    set({ links: insertCreatedById(get().links, link) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.links.update(id, patch)
    set({ links: get().links.map((l) => (l.id === id ? updated : l)) })
  },

  async remove(id) {
    await dataAdapter.links.remove(id)
    set({ links: get().links.filter((l) => l.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ links: [], loaded: false })
  },
}))
