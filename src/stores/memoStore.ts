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

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  loaded: false,

  async fetch() {
    try {
      const memos = await dataAdapter.memos.list()
      set({ memos, loaded: true })
    } catch (err) {
      console.error('加载碎碎念失败:', err)
      set({ memos: [], loaded: true })
    }
  },

  async add(input) {
    const memo = await dataAdapter.memos.create(input)
    set({ memos: [memo, ...get().memos] })
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
    set({ memos: [], loaded: false })
  },
}))
