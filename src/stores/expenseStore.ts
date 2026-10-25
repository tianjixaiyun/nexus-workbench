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

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loaded: false,

  async fetch() {
    try {
      const expenses = await dataAdapter.expenses.list()
      set({ expenses, loaded: true })
    } catch (err) {
      console.error('加载记账失败:', err)
      set({ expenses: [], loaded: true })
    }
  },

  async add(input) {
    const e = await dataAdapter.expenses.create(input)
    set({ expenses: [e, ...get().expenses] })
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
    set({ expenses: [], loaded: false })
  },
}))
