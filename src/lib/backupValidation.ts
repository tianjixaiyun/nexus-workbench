import type { Contact, Daily, Expense, Goal, Habit, LinkItem, Memo, Milestone, Note, Task, WorkItem } from './data/types'
import { GOAL_COLORS, HABIT_COLORS, NOTE_COLORS } from './data/types'
import { isSafeUrl } from './utils'
import { validateDeviceBackup, type DeviceBackup } from './deviceBackup'

export const BACKUP_VERSION = 13
export const BACKUP_COLLECTIONS = ['tasks', 'notes', 'links', 'habits', 'milestones', 'dailies', 'goals', 'works', 'memos', 'expenses', 'contacts'] as const
export type BackupCollection = typeof BACKUP_COLLECTIONS[number]
export const BACKUP_LABELS: Record<BackupCollection, string> = { tasks: '任务', notes: '笔记', links: '链接', habits: '习惯', milestones: '倒数日', dailies: '每日复盘', goals: '目标', works: '作品', memos: '碎碎念', expenses: '记账', contacts: '人脉' }
export interface BackupFile {
  app: 'nexus-workbench'; version: number; exportedAt: string
  tasks: Task[]; notes: Note[]; links: LinkItem[]; habits: Habit[]; milestones: Milestone[]; dailies: Daily[]
  goals: Goal[]; works: WorkItem[]; memos: Memo[]; expenses: Expense[]; contacts: Contact[]
  deviceData?: DeviceBackup
}
export interface PreparedBackup { backup: BackupFile; presentCollections: BackupCollection[]; warnings: string[] }
type Row = Record<string, unknown>
const EPOCH = '1970-01-01T00:00:00.000Z'
function fail(message: string): never { throw new Error(`${message}；当前数据未改动`) }
function object(value: unknown, label: string): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : fail(`${label} 必须是记录对象`)
}
function text(row: Row, key: string, fallback?: string): string {
  const value = row[key]
  if (value === undefined && fallback !== undefined) return fallback
  return typeof value === 'string' ? value : fail(`${key} 必须是文字`)
}
function number(row: Row, key: string, fallback: number, min = -Number.MAX_VALUE, max = Number.MAX_VALUE): number {
  const value = row[key] === undefined ? fallback : row[key]
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail(`${key} 必须是范围内的有效数字`)
}
function bool(row: Row, key: string): boolean {
  return row[key] === undefined ? false : typeof row[key] === 'boolean' ? row[key] as boolean : fail(`${key} 必须是布尔值`)
}
function choice<T extends string>(row: Row, key: string, values: readonly T[], fallback: T): T {
  return row[key] === undefined ? fallback : values.includes(row[key] as T) ? row[key] as T : fail(`${key} 的取值不受支持`)
}
function date(row: Row, key: string, nullable = false): string | null {
  if (nullable && (row[key] === undefined || row[key] === null || row[key] === '')) return null
  const value = text(row, key)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail(`${key} 日期格式不正确`)
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : fail(`${key} 不是有效日期`)
}
function timestamp(row: Row, key: string, fallback = EPOCH, nullable = false): string | null {
  if (nullable && (row[key] === undefined || row[key] === null || row[key] === '')) return null
  const value = text(row, key, fallback) || fallback
  return Number.isFinite(Date.parse(value)) ? value : fail(`${key} 时间格式不正确`)
}
function array(row: Row, key: string): unknown[] {
  let value = row[key] ?? []
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return fail(`${key} 数组已损坏`) }
    if (key === 'tags' && row[key] === '{}') value = []
  }
  return Array.isArray(value) ? value : fail(`${key} 必须是数组`)
}
function strings(row: Row, key: string): string[] {
  const values = array(row, key)
  return values.every((item) => typeof item === 'string') ? [...new Set(values as string[])] : fail(`${key} 必须只包含文字`)
}
function nullableText(row: Row, key: string): string | null { return row[key] === null || row[key] === undefined ? null : text(row, key) }
function url(row: Row, key: string, fallback?: string): string {
  const value = text(row, key, fallback)
  return isSafeUrl(value) ? value : fail(`${key} 包含不支持的地址协议`)
}
function normalize(key: BackupCollection, row: Row): unknown {
  const id = text(row, 'id')
  if (!id.trim()) fail(`${BACKUP_LABELS[key]} 缺少 ID`)
  const createdAt = timestamp(row, 'createdAt') as string
  const base = { id, createdAt }
  if (key === 'tasks') {
    const dueDate = date(row, 'dueDate', true)
    const dueTime = nullableText(row, 'dueTime') || null
    if (dueTime && (!dueDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dueTime))) fail('任务时间无效或缺少截止日期')
    const ids = new Set<string>()
    const subtasks = array(row, 'subtasks').map((value) => {
      const item = object(value, '子任务')
      const subId = text(item, 'id')
      if (!subId.trim() || ids.has(subId)) fail('子任务 ID 为空或重复')
      ids.add(subId)
      return { id: subId, title: text(item, 'title'), done: bool(item, 'done') }
    })
    return { ...base, title: text(row, 'title'), description: text(row, 'description', ''), status: choice(row, 'status', ['todo', 'doing', 'done'], 'todo'), priority: choice(row, 'priority', ['high', 'medium', 'low'], 'medium'), dueDate, ...(dueTime ? { dueTime } : {}), completedAt: timestamp(row, 'completedAt', EPOCH, true), deletedAt: timestamp(row, 'deletedAt', EPOCH, true), subtasks, tags: strings(row, 'tags'), recurrence: choice(row, 'recurrence', ['none', 'daily', 'weekly', 'monthly'], 'none'), focusMinutes: number(row, 'focusMinutes', 0, 0), sortOrder: number(row, 'sortOrder', 0), updatedAt: timestamp(row, 'updatedAt', createdAt) }
  }
  if (key === 'notes') return { ...base, title: text(row, 'title'), content: text(row, 'content', ''), color: choice(row, 'color', NOTE_COLORS, 'cyan'), pinned: bool(row, 'pinned'), deletedAt: timestamp(row, 'deletedAt', EPOCH, true), updatedAt: timestamp(row, 'updatedAt', createdAt) }
  if (key === 'links') return { ...base, name: text(row, 'name'), url: url(row, 'url'), group: text(row, 'group', '未分组') }
  if (key === 'habits') {
    const dates = strings(row, 'dates').map((value) => date({ date: value }, 'date') as string)
    return { ...base, name: text(row, 'name'), icon: text(row, 'icon', '🎯'), color: choice(row, 'color', HABIT_COLORS, 'cyan'), dates, archived: bool(row, 'archived') }
  }
  if (key === 'milestones') return { ...base, title: text(row, 'title'), date: date(row, 'date'), emoji: text(row, 'emoji', '🎯') }
  if (key === 'dailies') {
    if (row.mood === undefined) fail('每日复盘缺少心情数值')
    const mood = number(row, 'mood', 3, 1, 5)
    if (!Number.isInteger(mood)) fail('心情必须为 1 到 5 的整数')
    return { ...base, date: date(row, 'date'), mood, note: text(row, 'note', ''), updatedAt: timestamp(row, 'updatedAt', createdAt) }
  }
  if (key === 'goals') return { ...base, title: text(row, 'title'), emoji: text(row, 'emoji', '🎯'), color: choice(row, 'color', GOAL_COLORS, 'cyan'), tag: nullableText(row, 'tag'), mode: choice(row, 'mode', ['auto', 'manual'], 'auto'), manualProgress: number(row, 'manualProgress', 0, 0, 100), deadline: date(row, 'deadline', true) }
  if (key === 'works') {
    const images = strings(row, 'images')
    if (images.some((image) => !/^https?:\/\//i.test(image) && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(image))) fail('作品图片地址不受支持')
    return { ...base, title: text(row, 'title'), category: text(row, 'category', ''), year: text(row, 'year', ''), description: text(row, 'description', ''), images, link: url(row, 'link', '') }
  }
  if (key === 'memos') return { ...base, content: text(row, 'content'), tags: strings(row, 'tags'), pinned: bool(row, 'pinned') }
  if (key === 'expenses' && row.amount === undefined) fail('记账缺少金额')
  if (key === 'expenses') return { ...base, kind: choice(row, 'kind', ['expense', 'income'], 'expense'), amount: number(row, 'amount', 0, 0), category: text(row, 'category', '其他'), note: text(row, 'note', ''), date: date(row, 'date') }
  return { ...base, name: text(row, 'name'), company: text(row, 'company', ''), role: text(row, 'role', ''), tags: strings(row, 'tags'), email: text(row, 'email', ''), phone: text(row, 'phone', ''), note: text(row, 'note', ''), lastContactAt: date(row, 'lastContactAt', true), nextFollowUp: date(row, 'nextFollowUp', true) }
}

/** 先验证所有集合与设备字段，再把已归一化副本交给恢复流程。 */
export function validateBackup(raw: unknown): PreparedBackup {
  const source = object(raw, '备份')
  if (source.app !== 'nexus-workbench' || !Array.isArray(source.tasks)) fail('文件不是 NEXUS JSON 备份')
  const version = source.version ?? 1
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > BACKUP_VERSION) fail('备份版本不受支持，请使用匹配版本的 NEXUS')
  if (source.taskTemplates !== undefined && (!Array.isArray(source.taskTemplates) || source.taskTemplates.length > 0)) fail('备份包含当前版本不支持的自定义任务模板，请保留原文件并使用匹配版本恢复')
  const presentCollections: BackupCollection[] = []
  const warnings: string[] = []
  const result: Row = { app: 'nexus-workbench', version, exportedAt: typeof source.exportedAt === 'string' ? source.exportedAt : '' }
  for (const key of BACKUP_COLLECTIONS) {
    if (version >= 10 && source[key] === undefined) fail(`v${version} 备份缺少必要集合 ` + BACKUP_LABELS[key])
    if (source[key] !== undefined) presentCollections.push(key)
    else warnings.push(`旧备份没有${BACKUP_LABELS[key]}集合，默认不选择恢复；若勾选则本地清空该集合`)
    const values = source[key] === undefined ? [] : source[key]
    if (!Array.isArray(values)) fail(`${BACKUP_LABELS[key]}集合必须是数组`)
    const ids = new Set<string>()
    const dates = new Set<string>()
    result[key] = values.map((value, index) => {
      const row = object(value, `${BACKUP_LABELS[key]}第 ${index + 1} 条`)
      const normalized = normalize(key, row) as Row
      if (ids.has(normalized.id as string)) fail(`${BACKUP_LABELS[key]}存在重复 ID`)
      ids.add(normalized.id as string)
      if (key === 'dailies') {
    if (row.mood === undefined) fail('每日复盘缺少心情数值')
        if (dates.has(normalized.date as string)) fail('每日复盘存在重复日期')
        dates.add(normalized.date as string)
      }
      return normalized
    })
  }
  if (source.deviceData !== undefined) result.deviceData = validateDeviceBackup(source.deviceData)
  return { backup: result as unknown as BackupFile, presentCollections, warnings }
}

