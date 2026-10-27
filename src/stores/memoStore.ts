import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Memo, NewMemo } from '@/lib/data/types'

interface MemoState {
  memos: Memo[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewMemo) => Promise<void>
  update: (id: string, patch: Partial<Memo>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().memos, () => get().memos)
    try {
      request.assertReady()
      const rows = await dataAdapter.memos.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { memos: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('碎碎念', error)
    }
  },

  async add(input) {
    const memo = await dataAdapter.memos.create(input)
    set({ memos: insertCreatedById(get().memos, memo, true) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.memos.update(id, patch)
    set({ memos: get().memos.map((m) => (m.id === id ? updated : m)) })
  },

  async remove(id) {
    await dataAdapter.memos.remove(id)
    set({ memos: get().memos.filter((m) => m.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ memos: [], loaded: false })
  },
}))
