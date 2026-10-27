import { createStoreFetchGuard, insertCreatedById, reportStoreReadError } from './storeConcurrency'
import { create } from 'zustand'
import { dataAdapter } from '@/lib/data'
import type { NewNote, Note } from '@/lib/data/types'
import { nowIso } from '@/lib/utils'
import { TRASH_RETENTION_DAYS } from './taskStore'

/** 未删除的笔记 */
export function activeNotes(notes: Note[]): Note[] {
  return notes.filter((n) => !n.deletedAt)
}

/** 回收站里的笔记 */
export function trashedNotes(notes: Note[]): Note[] {
  return notes.filter((n) => n.deletedAt)
}

interface NoteState {
  notes: Note[]
  loaded: boolean
  fetch: () => Promise<void>
  add: (input: NewNote) => Promise<void>
  update: (id: string, patch: Partial<Note>) => Promise<void>
  softDelete: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  emptyTrash: () => Promise<void>
  purgeExpired: () => Promise<void>
  reset: () => void
}

/** 置顶在前,其余按更新时间倒序(列表展示统一用这个排序) */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

const fetchGuard = createStoreFetchGuard()

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loaded: false,

  async fetch() {
    const request = fetchGuard.begin(get().notes, () => get().notes)
    try {
      request.assertReady()
      const rows = await dataAdapter.notes.list()
      if (!request.isCurrent()) return
      // 并发更新或受控云端刷新已换过数组时，保留较新的界面记录。
      set(request.canReplaceRows() ? { notes: rows, loaded: true } : { loaded: true })
    } catch (error) {
      if (!request.isCurrent()) return
      set({ loaded: true })
      reportStoreReadError('便签', error)
    }
  },

  async add(input) {
    const note = await dataAdapter.notes.create(input)
    set({ notes: insertCreatedById(get().notes, note, true) })
  },

  async update(id, patch) {
    const updated = await dataAdapter.notes.update(id, patch)
    set({ notes: get().notes.map((n) => (n.id === id ? updated : n)) })
  },

  async remove(id) {
    await dataAdapter.notes.remove(id)
    set({ notes: get().notes.filter((n) => n.id !== id) })
  },

  async softDelete(id) {
    await get().update(id, { deletedAt: nowIso() })
  },

  async restore(id) {
    await get().update(id, { deletedAt: null })
  },

  async emptyTrash() {
    const trashed = get().notes.filter((n) => n.deletedAt)
    await Promise.all(trashed.map((n) => dataAdapter.notes.remove(n.id)))
    set({ notes: get().notes.filter((n) => !n.deletedAt) })
  },

  async purgeExpired() {
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const expired = get().notes.filter((n) => n.deletedAt && new Date(n.deletedAt).getTime() < cutoff)
    if (expired.length === 0) return
    await Promise.all(expired.map((n) => dataAdapter.notes.remove(n.id)))
    const expiredIds = new Set(expired.map((n) => n.id))
    set({ notes: get().notes.filter((n) => !expiredIds.has(n.id)) })
  },

  reset() {
    fetchGuard.reset()
    set({ notes: [], loaded: false })
  },
}))
