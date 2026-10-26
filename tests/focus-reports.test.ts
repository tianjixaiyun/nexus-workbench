import { beforeEach, expect, it, vi } from 'vitest'
const { empty } = vi.hoisted(() => ({ empty: { getState: () => ({ tasks: [], notes: [], habits: [], dailies: [], links: [], memos: [] }) } }))
vi.mock('../src/stores/taskStore', () => ({ useTaskStore: empty, activeTasks: (items: unknown[]) => items }))
vi.mock('../src/stores/noteStore', () => ({ useNoteStore: empty, activeNotes: (items: unknown[]) => items }))
vi.mock('../src/stores/habitStore', () => ({ useHabitStore: empty, streakOf: () => 0 }))
vi.mock('../src/stores/dailyStore', () => ({ useDailyStore: empty }))
vi.mock('../src/stores/linkStore', () => ({ useLinkStore: empty }))
vi.mock('../src/stores/memoStore', () => ({ useMemoStore: empty }))
import { journalFacts } from '../src/lib/journal'
import { askAssistant } from '../src/lib/assistant'
import { todayStr } from '../src/lib/utils'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
  const date = todayStr()
  localStorage.setItem('nexus:pomodoro', JSON.stringify({ [date]: 1, __minutes: { [date]: 55 } }))
})
it('工作日志使用自定义专注的真实分钟', () => expect(journalFacts(todayStr()).focusMinutes).toBe(55))
it('助手专注回答的事实槽位也使用真实分钟', () => expect(askAssistant('专注').prompt).toContain('55 分钟'))
