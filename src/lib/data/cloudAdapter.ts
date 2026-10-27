import type { DataAdapter, EntityStore } from './adapter'
import type {
  Daily,
  Goal,
  Habit,
  LinkItem,
  Milestone,
  NewDaily,
  NewGoal,
  NewHabit,
  NewLink,
  NewMilestone,
  NewNote,
  NewTask,
  Note,
  Task,
  WorkItem,
  NewWork,
  Memo,
  NewMemo,
  Expense,
  NewExpense,
  Contact,
  NewContact,
} from './types'
import { supabase } from '../config'
import { uid } from '../utils'
import { BACKUP_IMPORT_USER } from '../backupImport'

/**
 * Supabase 云端实现。
 * 表结构与字段映射见 supabase/schema.sql;所有查询都带 user_id 条件,
 * 数据库侧同时开启 RLS 做双重隔离。
 */

type Row = Record<string, unknown>

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase!.auth.getSession()
  if (error) throw error
  const id = data.session?.user?.id
  if (!id) throw new Error('未登录')
  return id
}

function makeCloudStore<T, New>(
  table: string,
  orderColumn: string,
  toColumns: (item: Partial<T>) => Row,
  fromRow: (row: Row) => T,
): EntityStore<T, New> {
  return {
    async list() {
      const userId = await requireUserId()
      const { data, error } = await supabase!
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order(orderColumn, { ascending: true })
      if (error) throw error
      return (data ?? []).map(fromRow)
    },
    async create(item: New) {
      const userId = await requireUserId()
      const expected = (item as New & { [BACKUP_IMPORT_USER]?: string })[BACKUP_IMPORT_USER]
      if (expected && expected !== userId) throw new Error('导入账号已变化，已停止发送写入请求')
      const { data, error } = await supabase!
        .from(table)
        .insert({ ...toColumns(item as Partial<T>), id: uid(), user_id: userId })
        .select()
        .single()
      if (error) throw error
      return fromRow(data as Row)
    },
    async update(id, patch) {
      const userId = await requireUserId()
      // undefined 字段会被 JSON 序列化丢弃,只更新传入的列;updated_at 由数据库触发器维护
      const { data, error } = await supabase!
        .from(table)
        .update(toColumns(patch))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw error
      return fromRow(data as Row)
    },
    async remove(id) {
      const userId = await requireUserId()
      const { error } = await supabase!.from(table).delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
  }
}

// —— 字段映射:camelCase(前端) ↔ snake_case(数据库) ——

const taskRow = (t: Partial<Task>): Row => ({
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  due_date: t.dueDate,
  completed_at: t.completedAt,
  subtasks: t.subtasks,
  tags: t.tags,
  deleted_at: t.deletedAt,
  recurrence: t.recurrence,
  focus_minutes: t.focusMinutes,
  sort_order: t.sortOrder,
})

const fromTaskRow = (r: Row): Task => ({
  id: r.id as string,
  title: r.title as string,
  description: (r.description as string) ?? '',
  status: r.status as Task['status'],
  priority: r.priority as Task['priority'],
  dueDate: (r.due_date as string | null) ?? null,
  completedAt: (r.completed_at as string | null) ?? null,
  subtasks: (r.subtasks as Task['subtasks']) ?? [],
  tags: (r.tags as Task['tags']) ?? [],
  deletedAt: (r.deleted_at as string | null) ?? null,
  recurrence: (r.recurrence as Task['recurrence']) ?? 'none',
  focusMinutes: (r.focus_minutes as number) ?? 0,
  sortOrder: (r.sort_order as number) ?? 0,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

const noteRow = (n: Partial<Note>): Row => ({
  title: n.title,
  content: n.content,
  color: n.color,
  pinned: n.pinned,
  deleted_at: n.deletedAt,
})

const fromNoteRow = (r: Row): Note => ({
  id: r.id as string,
  title: r.title as string,
  content: r.content as string,
  color: r.color as Note['color'],
  pinned: Boolean(r.pinned),
  deletedAt: (r.deleted_at as string | null) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

const memoRow = (m: Partial<Memo>): Row => ({
  content: m.content ?? '',
  tags: JSON.stringify(m.tags ?? []),
  pinned: m.pinned ?? false,
})

const fromMemoRow = (r: Row): Memo => ({
  id: String(r.id),
  content: (r.content as string) ?? '',
  tags: safeParseImages(r.tags as string | string[] | null),
  pinned: Boolean(r.pinned),
  createdAt: (r.created_at as string) ?? '',
})

const expenseRow = (e: Partial<Expense>): Row => ({
  kind: e.kind ?? 'expense',
  amount: e.amount ?? 0,
  category: e.category ?? '',
  note: e.note ?? '',
  date: e.date ?? '',
})

const fromExpenseRow = (r: Row): Expense => ({
  id: String(r.id),
  kind: (r.kind as Expense['kind']) ?? 'expense',
  amount: Number(r.amount) || 0,
  category: (r.category as string) ?? '',
  note: (r.note as string) ?? '',
  date: (r.date as string) ?? '',
  createdAt: (r.created_at as string) ?? '',
})

const workRow = (w: Partial<WorkItem>): Row => ({
  title: w.title ?? '',
  category: w.category ?? '',
  year: w.year ?? '',
  description: w.description ?? '',
  images: JSON.stringify(w.images ?? []),
  link: w.link ?? '',
})

const fromWorkRow = (r: Row): WorkItem => ({
  id: String(r.id),
  title: (r.title as string) ?? '',
  category: (r.category as string) ?? '',
  year: (r.year as string) ?? '',
  description: (r.description as string) ?? '',
  images: safeParseImages(r.images as string | string[] | null),
  link: (r.link as string) ?? '',
  createdAt: (r.created_at as string) ?? '',
})

function safeParseImages(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  if (typeof v === 'string') {
    try { const a = JSON.parse(v); return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
  }
  return []
}

const linkRow = (l: Partial<LinkItem>): Row => ({
  name: l.name,
  url: l.url,
  group: l.group,
})

const fromLinkRow = (r: Row): LinkItem => ({
  id: r.id as string,
  name: r.name as string,
  url: r.url as string,
  group: (r.group as string) ?? '未分组',
  createdAt: r.created_at as string,
})

const habitRow = (h: Partial<Habit>): Row => ({
  name: h.name,
  icon: h.icon,
  color: h.color,
  dates: h.dates,
  archived: h.archived,
})

const fromHabitRow = (r: Row): Habit => ({
  id: r.id as string,
  name: r.name as string,
  icon: (r.icon as string) ?? '🎯',
  color: (r.color as Habit['color']) ?? 'cyan',
  dates: (r.dates as Habit['dates']) ?? [],
  archived: Boolean(r.archived),
  createdAt: r.created_at as string,
})

const milestoneRow = (m: Partial<Milestone>): Row => ({
  title: m.title,
  date: m.date,
  emoji: m.emoji,
})

const fromMilestoneRow = (r: Row): Milestone => ({
  id: r.id as string,
  title: r.title as string,
  date: r.date as string,
  emoji: (r.emoji as string) ?? '🎯',
  createdAt: r.created_at as string,
})

const dailyRow = (d: Partial<Daily>): Row => ({
  date: d.date,
  mood: d.mood,
  note: d.note,
})

const fromDailyRow = (r: Row): Daily => ({
  id: r.id as string,
  date: r.date as string,
  mood: (r.mood as number) ?? 3,
  note: (r.note as string) ?? '',
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

const goalRow = (g: Partial<Goal>): Row => ({
  title: g.title,
  emoji: g.emoji,
  color: g.color,
  tag: g.tag,
  mode: g.mode,
  manual_progress: g.manualProgress,
  deadline: g.deadline,
})

const fromGoalRow = (r: Row): Goal => ({
  id: r.id as string,
  title: r.title as string,
  emoji: (r.emoji as string) ?? '🎯',
  color: (r.color as Goal['color']) ?? 'cyan',
  tag: (r.tag as string | null) ?? null,
  mode: (r.mode as Goal['mode']) ?? 'auto',
  manualProgress: (r.manual_progress as number) ?? 0,
  deadline: (r.deadline as string | null) ?? null,
  createdAt: r.created_at as string,
})

const contactsRow = (c: Partial<Contact>): Row => ({
  name: c.name ?? '',
  company: c.company ?? '',
  role: c.role ?? '',
  tags: JSON.stringify(c.tags ?? []),
  email: c.email ?? '',
  phone: c.phone ?? '',
  note: c.note ?? '',
  last_contact_at: c.lastContactAt ?? null,
  next_follow_up: c.nextFollowUp ?? null,
})

const fromContactsRow = (r: Row): Contact => ({
  id: String(r.id),
  name: (r.name as string) ?? '',
  company: (r.company as string) ?? '',
  role: (r.role as string) ?? '',
  tags: safeParseImages(r.tags as string | string[] | null),
  email: (r.email as string) ?? '',
  phone: (r.phone as string) ?? '',
  note: (r.note as string) ?? '',
  lastContactAt: (r.last_contact_at as string | null) ?? null,
  nextFollowUp: (r.next_follow_up as string | null) ?? null,
  createdAt: (r.created_at as string) ?? '',
})

export const cloudAdapter: DataAdapter = {
  tasks: makeCloudStore<Task, NewTask>('tasks', 'sort_order', taskRow, fromTaskRow),
  notes: makeCloudStore<Note, NewNote>('notes', 'created_at', noteRow, fromNoteRow),
  links: makeCloudStore<LinkItem, NewLink>('links', 'created_at', linkRow, fromLinkRow),
  habits: makeCloudStore<Habit, NewHabit>('habits', 'created_at', habitRow, fromHabitRow),
  milestones: makeCloudStore<Milestone, NewMilestone>('milestones', 'created_at', milestoneRow, fromMilestoneRow),
  dailies: makeCloudStore<Daily, NewDaily>('dailies', 'created_at', dailyRow, fromDailyRow),
  goals: makeCloudStore<Goal, NewGoal>('goals', 'created_at', goalRow, fromGoalRow),
  works: makeCloudStore<WorkItem, NewWork>('works', 'created_at', workRow, fromWorkRow),
  memos: makeCloudStore<Memo, NewMemo>('memos', 'created_at', memoRow, fromMemoRow),
  expenses: makeCloudStore<Expense, NewExpense>('expenses', 'created_at', expenseRow, fromExpenseRow),
  contacts: makeCloudStore<Contact, NewContact>('contacts', 'created_at', contactsRow, fromContactsRow),
}
