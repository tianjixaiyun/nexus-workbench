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

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  loaded: false,

  async fetch() {
    try {
      const contacts = await dataAdapter.contacts.list()
      set({ contacts, loaded: true })
    } catch (err) {
      console.error('加载人脉失败:', err)
      set({ contacts: [], loaded: true })
    }
  },

  async add(input) {
    const contact = await dataAdapter.contacts.create(input)
    set({ contacts: [contact, ...get().contacts] })
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
    set({ contacts: [], loaded: false })
  },
}))
