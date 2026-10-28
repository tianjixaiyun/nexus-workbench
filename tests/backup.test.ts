import 'fake-indexeddb/auto'
import { afterAll, beforeEach, expect, it, vi } from 'vitest'
const mode = vi.hoisted(() => ({ cloud: false }))
vi.mock('../src/lib/config', () => ({ get isCloudMode() { return mode.cloud }, supabase: null }))
vi.mock('../src/stores/settingsStore', () => ({ useSettingsStore: { getState: () => ({ markExported: () => undefined }) } }))
vi.mock('../src/stores/toastStore', () => ({ toast: { success: () => undefined } }))
import { db, localAdapter } from '../src/lib/data/localAdapter'
import { createBackup, importData } from '../src/lib/backup'
import { useAuthStore } from '../src/stores/authStore'

const backup = (extra: Record<string, unknown> = {}) => ({ app: 'nexus-workbench', version: 9, tasks: [], notes: [], links: [], habits: [], milestones: [], dailies: [], goals: [], works: [], memos: [], expenses: [], contacts: [], ...extra })
const file = (value: unknown) => ({ name: 'backup.json', size: JSON.stringify(value).length, text: async () => JSON.stringify(value) }) as File
const task = { id: 'restored', title: '恢复任务', status: 'todo', priority: 'medium', description: '', dueDate: null, sortOrder: 100, createdAt: '2026-01-01', updatedAt: '2026-01-01' }

beforeEach(async () => {
  mode.cloud = false
  vi.restoreAllMocks()
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
  useAuthStore.setState({ ready: true, user: { id: 'local' } })
  await Promise.all(db.tables.map((table) => table.clear()))
})
afterAll(() => db.close())

it('rejects a corrupt record before a real IndexedDB replacement can remove existing data', async () => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup({ tasks: [{ id: 'broken' }] })))).rejects.toThrow()
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})

it.each([
  { notes: '损坏' }, { version: 999 }, { tasks: [task, task] },
  { expenses: [{ id: 'expense', kind: 'expense', amount: -2, category: '其他', date: '2026-10-27' }] },
  { links: [{ id: 'link', name: '危险入口', url: 'javascript:alert(1)' }] },
  { dailies: [{ id: 'daily', date: '2026-02-30', mood: 8 }] },
  { taskTemplates: [{ id: 'legacy', title: '不支持的自定义模板' }] },
])('rejects invalid backup fields without changing the database: %j', async (extra) => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup(extra)))).rejects.toThrow()
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})

it('accepts legal legacy collections and normalizes missing task fields', async () => {
  const result = await importData(file({ app: 'nexus-workbench', version: 1, tasks: [task] }))
  expect(result.counts).toContain('任务 1')
  expect((await localAdapter.tasks.list())[0]).toMatchObject({ tags: [], subtasks: [], recurrence: 'none', focusMinutes: 0 })
})

it('preserves task times in local storage and backup while accepting old tasks', async () => {
  await localAdapter.tasks.create({ title: '有时间', dueDate: '2026-12-31', dueTime: '09:30' })
  const exported = await createBackup()
  expect(exported.version).toBe(11)
  expect(exported.tasks[0].dueTime).toBe('09:30')
  await importData(file(exported))
  expect((await localAdapter.tasks.list())[0].dueTime).toBe('09:30')
})

it('rejects invalid or dateless task times before changing data', async () => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup({ tasks: [{ ...task, dueDate: '2026-12-31', dueTime: '25:00' }] })))).rejects.toThrow()
  await expect(importData(file(backup({ tasks: [{ ...task, dueTime: '09:30' }] })))).rejects.toThrow()
  expect((await localAdapter.tasks.list())[0].title).toBe('保留我')
})

it('rolls all eleven tables back if one table write fails', async () => {
  await localAdapter.tasks.create({ title: '原任务' })
  await localAdapter.notes.create({ title: '原笔记', content: '正文' })
  const failWrite = () => { throw new Error('模拟写入失败') }
  db.notes.hook('creating', failWrite)
  await expect(importData(file(backup({ tasks: [task], notes: [{ id: 'new-note', title: '新笔记', content: '新正文' }] })))).rejects.toThrow('模拟写入失败')
  expect((await db.tasks.toArray())[0].title).toBe('原任务')
  expect((await db.notes.toArray())[0].title).toBe('原笔记')
  db.notes.hook('creating').unsubscribe(failWrite)
})

it('stops cloud append after the account changes and reports the completed count', async () => {
  mode.cloud = true
  useAuthStore.setState({ ready: true, user: { id: 'account-a' } })
  const created: string[] = []
  vi.spyOn(localAdapter.tasks, 'create').mockImplementation(async (input) => {
    created.push(input.title)
    useAuthStore.setState({ user: { id: 'account-b' } })
    return { ...task, title: input.title } as never
  })
  await expect(importData(file(backup({ tasks: [task, { ...task, id: 'second', title: '第二条' }] })))).rejects.toThrow(/已成功写入 1 条.*账号/)
  expect(created).toEqual(['恢复任务'])
})

it('refuses import while an active or paused focus session exists', async () => {
  localStorage.setItem('nexus:focus-timer', JSON.stringify({ version: 1, sessionId: 'paused', running: false }))
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup()))).rejects.toThrow(/专注.*重置/)
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})


it('keeps collections absent from a legacy file by default rather than silently clearing them', async () => {
  await localAdapter.notes.create({ title: '保留旧文件未覆盖的笔记', content: '正文' })
  await importData(file({ app: 'nexus-workbench', version: 1, tasks: [task] }))
  expect((await db.notes.toArray())[0].title).toBe('保留旧文件未覆盖的笔记')
})

it('validates device fields before touching business collections even when device restore was not selected', async () => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup({ version: 10, deviceData: { 'nexus-pin': '1234' } })))).rejects.toThrow()
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})

it('v10 device content is not restored unless it was explicitly selected', async () => {
  localStorage.setItem('nexus:journal', JSON.stringify({ keep: 'existing' }))
  await importData(file(backup({ version: 10, deviceData: { 'nexus:journal': {} } })))
  expect(localStorage.getItem('nexus:journal')).toBe(JSON.stringify({ keep: 'existing' }))
})

it('reports separate device-step failure without claiming the committed business restore was rolled back', async () => {
  localStorage.setItem('nexus:journal', JSON.stringify({ old: '原日志' }))
  const previous = localStorage.getItem('nexus:journal')
  const set = localStorage.setItem.bind(localStorage)
  let failed = false
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'nexus:journal' && !failed) { failed = true; throw new Error('QuotaExceededError') }
    set(key, value)
  })
  const result = await importData(file(backup({ version: 10, tasks: [task], deviceData: { 'nexus:journal': {} } })), { deviceKeys: ['nexus:journal'] })
  expect(result.deviceWarning).toContain('业务集合已完成恢复')
  expect(result.deviceWarning).toContain('已还原')
  expect((await db.tasks.toArray())[0].title).toBe('恢复任务')
  expect(localStorage.getItem('nexus:journal')).toBe(previous)
})

it('does not treat a structurally incomplete v10 file as a legacy backup', async () => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file({ app: 'nexus-workbench', version: 10, tasks: [] }))).rejects.toThrow(/集合|缺少/)
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})

it.each([
  { expenses: [{ id: 'expense', kind: 'expense', category: '其他', date: '2026-10-27' }] },
  { dailies: [{ id: 'daily', date: '2026-10-27' }] },
])('does not invent a missing amount or mood in imported records: %j', async (extra) => {
  await localAdapter.tasks.create({ title: '保留我' })
  await expect(importData(file(backup(extra)))).rejects.toThrow()
  expect((await db.tasks.toArray())[0].title).toBe('保留我')
})


it('exports and restores all eleven real collections plus selected focus history and edited logs', async () => {
  await localAdapter.tasks.create({ title: '真实任务', tags: ['学习'] })
  await localAdapter.notes.create({ title: '真实笔记', content: '正文' })
  await localAdapter.links.create({ name: '文档', url: 'https://example.com' })
  await localAdapter.habits.create({ name: '读书', icon: '📖', color: 'cyan', dates: ['2026-10-27'] })
  await localAdapter.milestones.create({ title: '里程碑', date: '2027-01-01' })
  await localAdapter.dailies.create({ date: '2026-10-27', mood: 4, note: '复盘文字' })
  await localAdapter.goals.create({ title: '学习目标' })
  await localAdapter.works.create({ title: '作品', category: '开发', year: '2026', description: '介绍', images: [], link: '' })
  await localAdapter.memos.create({ content: '碎碎念', tags: ['生活'], pinned: true })
  await localAdapter.expenses.create({ kind: 'expense', amount: 12.5, category: '餐饮', note: '午餐', date: '2026-10-27' })
  await localAdapter.contacts.create({ name: '同学' })
  const history = { '2026-10-27': 2, __minutes: { '2026-10-27': 73 }, __completed: { 'real-session': '2026-10-27' } }
  const logs = { '2026-10-27': { date: '2026-10-27', text: '亲手写下的日志', generatedAt: '2026-10-27T00:00:00Z', edited: true } }
  localStorage.setItem('nexus:pomodoro', JSON.stringify(history))
  localStorage.setItem('nexus:journal', JSON.stringify(logs))
  const exported = await createBackup()
  expect(exported.version).toBe(11)
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.removeItem('nexus:pomodoro')
  localStorage.removeItem('nexus:journal')
  const restored = await importData(file(exported), { deviceKeys: ['nexus:pomodoro', 'nexus:journal'] })
  expect(restored.deviceWarning).toBeUndefined()
  for (const table of db.tables) expect(await table.count()).toBe(1)
  expect((await db.tasks.toArray())[0].id).toBe(exported.tasks[0].id)
  expect((await db.dailies.toArray())[0].note).toBe('复盘文字')
  expect(JSON.parse(localStorage.getItem('nexus:pomodoro')!)).toEqual(history)
  expect(JSON.parse(localStorage.getItem('nexus:journal')!)).toEqual(logs)
})

it.each(['java\nscript:alert(1)', 'java\tscript:alert(1)', '\rjavascript:alert(1)'])('rejects control-character protocol tricks in business links and work URLs: %j', async (url) => {
  await localAdapter.tasks.create({ title: '原任务' })
  for (const extra of [
    { links: [{ id: 'unsafe-link', name: '入口', url }] },
    { works: [{ id: 'unsafe-work', title: '作品', images: [], link: url }] },
  ]) await expect(importData(file(backup(extra)))).rejects.toThrow(/协议/)
  expect((await db.tasks.toArray())[0].title).toBe('原任务')
})

it.each(['../guide/start?tag=1#intro', '/tasks', '#notes'])('still accepts relative URLs in business links and work records: %j', async (url) => {
  await importData(file(backup({ links: [{ id: 'relative-link', name: '入口', url }], works: [{ id: 'relative-work', title: '作品', images: [], link: url }] })))
  expect((await db.links.toArray())[0].url).toBe(url)
  expect((await db.works.toArray())[0].link).toBe(url)
})
