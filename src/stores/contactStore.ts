import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { Contact, NewContact } from '@/lib/data/types'

interface ContactState {
  contacts: Contact[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewContact) => Promise<void>
  update: (id: string, patch: Partial<Contact>) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

const fetchGuard = createStoreFetchGuard()

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().contacts, () => get().contacts)
    try {
      request.assertReady()
      const rows = await dataAdapter.contacts.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { contacts: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('人脉', error)
    }
  },

  async add(input) {
    const contact = await dataAdapter.contacts.create(input)
    set({ contacts: insertCreatedById(get().contacts, contact, true) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.contacts.update(id, patch)
    set({ contacts: get().contacts.map((c) => (c.id === id ? updated : c)) })
  },

  async remove(id) {
    await dataAdapter.contacts.remove(id)
    set({ contacts: get().contacts.filter((c) => c.id !== id) })
  },

  reset() {
    fetchGuard.reset()
    set({ contacts: [], loaded: false })
  },
}))
