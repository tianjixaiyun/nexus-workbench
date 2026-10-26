import { create } from 'zustand'
import { generateJournal, loadJournal, saveJournalEntry, type JournalEntry } from '@/lib/journal'

/**
 * 自动日志 store(localStorage 存储,设备本地属性,不进云端/备份结构):
 * 首次打开某天自动生成;手动编辑过标记 edited,再生成不覆盖。
 */
interface JournalState {
  entries: Record<string, JournalEntry>
  loaded: boolean
  fetch: () => void
  /** 生成指定日期的日志(已存在且手动编辑过则不覆盖,除非 force) */
  generate: (date: string, force?: boolean) => string
  /** 手动保存编辑 */
  save: (date: string, text: string) => void
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: {},
  loaded: false,

  fetch() {
    set({ entries: loadJournal(), loaded: true })
  },

  generate(date, force = false) {
    const existing = get().entries[date]
    if (existing && existing.edited && !force) return existing.text
    const entry: JournalEntry = { date, text: generateJournal(date), generatedAt: new Date().toISOString(), edited: false }
    saveJournalEntry(entry)
    set({ entries: { ...get().entries, [date]: entry } })
    return entry.text
  },

  save(date, text) {
    const existing = get().entries[date]
    const entry: JournalEntry = existing
      ? { ...existing, text, edited: true }
      : { date, text, generatedAt: new Date().toISOString(), edited: true }
    saveJournalEntry(entry)
    set({ entries: { ...get().entries, [date]: entry } })
  },
}))
