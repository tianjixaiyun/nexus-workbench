import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Expense, NewExpense } from '@/lib/data/types'

interface ExpenseState {
  expenses: Expense[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewExpense) => Promise<void>
  update: (id: string, patch: Partial<Expense>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().expenses, () => get().expenses)
    try {
      request.assertReady()
      const rows = await dataAdapter.expenses.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { expenses: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('记账', error)
    }
  },

  async add(input) {
    const e = await dataAdapter.expenses.create(input)
    set({ expenses: insertCreatedById(get().expenses, e, true) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.expenses.update(id, patch)
    set({ expenses: get().expenses.map((e) => (e.id === id ? updated : e)) })
  },

  async remove(id) {
    await dataAdapter.expenses.remove(id)
    set({ expenses: get().expenses.filter((e) => e.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ expenses: [], loaded: false })
  },
}))
