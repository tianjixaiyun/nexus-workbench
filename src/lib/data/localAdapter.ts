import Dexie, { type EntityTable, type UpdateSpec } from 'dexie'
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
  NewWork,
  NewMemo,
  NewExpense,
  Memo,
  Expense,
  Note,
  Task,
  WorkItem,
} from './types'
import { nowIso, uid } from '../utils'

/** 本地 IndexedDB 数据库名(改此名会"丢"旧数据,视为迁移) */
const DB_NAME = 'nexus-workbench'

const db = new Dexie(DB_NAME) as Dexie & {
  tasks: EntityTable<Task, 'id'>
  notes: EntityTable<Note, 'id'>
  links: EntityTable<LinkItem, 'id'>
  habits: EntityTable<Habit, 'id'>
  milestones: EntityTable<Milestone, 'id'>
  dailies: EntityTable<Daily, 'id'>
  goals: EntityTable<Goal, 'id'>
  works: EntityTable<WorkItem, 'id'>
  memos: EntityTable<Memo, 'id'>
  expenses: EntityTable<Expense, 'id'>
}

// v2:新增 habits / milestones 表;v3:新增 dailies(每日心情)表;v4:新增 goals 表(旧表结构沿用)
db.version(1).stores({
  tasks: 'id, status, priority, dueDate, sortOrder',
  notes: 'id, pinned, updatedAt',
  links: 'id, group',
})
db.version(2).stores({
  habits: 'id, archived',
  milestones: 'id, date',
})
db.version(3).stores({
  dailies: 'id, date',
})
db.version(4).stores({
  goals: 'id',
})

/** 本地模式的用户标识(单用户) */
const LOCAL_USER_ID = 'local'

/** 归一化旧版本的存量记录:补齐后来新增的字段,避免读旧数据时 undefined */
function normalizeTask(t: Task): Task {
  return {
    ...t,
    completedAt: t.completedAt ?? null,
    subtasks: t.subtasks ?? [],
    tags: t.tags ?? [],
    deletedAt: t.deletedAt ?? null,
    recurrence: t.recurrence ?? 'none',
    focusMinutes: t.focusMinutes ?? 0,
  }
}

function normalizeNote(n: Note): Note {
  return { ...n, deletedAt: n.deletedAt ?? null }
}

const tasks: EntityStore<Task, NewTask> = {
  async list() {
    const all = await db.tasks.orderBy('sortOrder').toArray()
    return all.map(normalizeTask)
  },
  async create(input) {
    const now = nowIso()
    const last = await db.tasks.orderBy('sortOrder').last()
    const task: Task = {
      id: uid(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ?? null,
      completedAt: input.completedAt ?? null,
      subtasks: input.subtasks ?? [],
      tags: input.tags ?? [],
      deletedAt: null,
      recurrence: input.recurrence ?? 'none',
      focusMinutes: input.focusMinutes ?? 0,
      sortOrder: input.sortOrder ?? (last ? last.sortOrder + 100 : 100),
      createdAt: now,
      updatedAt: now,
    }
    await db.tasks.add(task)
    return task
  },
  async update(id, patch) {
    await db.tasks.update(id, { ...patch, updatedAt: nowIso() } as UpdateSpec<Task>)
    const task = await db.tasks.get(id)
    if (!task) throw new Error(`任务不存在: ${id}`)
    return normalizeTask(task)
  },
  async remove(id) {
    await db.tasks.delete(id)
  },
}

const notes: EntityStore<Note, NewNote> = {
  async list() {
    const all = await db.notes.orderBy('updatedAt').reverse().toArray()
    return all.map(normalizeNote)
  },
  async create(input) {
    const now = nowIso()
    const note: Note = {
      id: uid(),
      title: input.title,
      content: input.content,
      color: input.color ?? 'cyan',
      pinned: input.pinned ?? false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.notes.add(note)
    return note
  },
  async update(id, patch) {
    await db.notes.update(id, { ...patch, updatedAt: nowIso() } as UpdateSpec<Note>)
    const note = await db.notes.get(id)
    if (!note) throw new Error(`笔记不存在: ${id}`)
    return normalizeNote(note)
  },
  async remove(id) {
    await db.notes.delete(id)
  },
}

const memos: EntityStore<Memo, NewMemo> = {
  async list() {
    const all = await db.memos.toArray()
    return all.map(normalizeMemo).sort((a, b) => (a.pinned === b.pinned ? (a.createdAt < b.createdAt ? 1 : -1) : a.pinned ? -1 : 1))
  },
  async create(input: NewMemo) {
    const memo = normalizeMemo(input)
    const item: Memo = { ...memo, id: uid(), createdAt: nowIso() }
    await db.memos.add(item)
    return item
  },
  async update(id, patch) {
    await db.memos.update(id, patch as UpdateSpec<Memo>)
    const memo = await db.memos.get(id)
    if (!memo) throw new Error('碎碎念不存在')
    return normalizeMemo(memo)
  },
  async remove(id) {
    await db.memos.delete(id)
  },
}

const expenses: EntityStore<Expense, NewExpense> = {
  async list() {
    const all = await db.expenses.toArray()
    return all.map(normalizeExpense).sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1))
  },
  async create(input: NewExpense) {
    const e = normalizeExpense(input)
    const item: Expense = { ...e, id: uid(), createdAt: nowIso() }
    await db.expenses.add(item)
    return item
  },
  async update(id, patch) {
    await db.expenses.update(id, patch as UpdateSpec<Expense>)
    const e = await db.expenses.get(id)
    if (!e) throw new Error('记录不存在')
    return normalizeExpense(e)
  },
  async remove(id) {
    await db.expenses.delete(id)
  },
}

const works: EntityStore<WorkItem, NewWork> = {
  async list() {
    const all = await db.works.toArray()
    return all
      .map(normalizeWork)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
  async create(input: NewWork) {
    const work: WorkItem = { ...normalizeWork(input), id: uid(), createdAt: nowIso() }
    await db.works.add(work)
    return work
  },
  async update(id, patch) {
    await db.works.update(id, patch as UpdateSpec<WorkItem>)
    const work = await db.works.get(id)
    if (!work) throw new Error('作品不存在')
    return normalizeWork(work)
  },
  async remove(id) {
    await db.works.delete(id)
  },
}

function normalizeMemo(m: Partial<Memo>): Memo {
  return {
    id: m.id ?? '',
    content: m.content ?? '',
    tags: Array.isArray(m.tags) ? m.tags : [],
    pinned: m.pinned ?? false,
    createdAt: m.createdAt ?? nowIso(),
  }
}

function normalizeExpense(e: Partial<Expense>): Expense {
  return {
    id: e.id ?? '',
    kind: e.kind === 'income' ? 'income' : 'expense',
    amount: typeof e.amount === 'number' && Number.isFinite(e.amount) ? e.amount : 0,
    category: e.category ?? '其他',
    note: e.note ?? '',
    date: e.date ?? nowIso().slice(0, 10),
    createdAt: e.createdAt ?? nowIso(),
  }
}

function normalizeWork(w: Partial<WorkItem>): WorkItem {
  return {
    id: w.id ?? '',
    title: w.title ?? '',
    category: w.category ?? '',
    year: w.year ?? '',
    description: w.description ?? '',
    images: Array.isArray(w.images) ? w.images : [],
    link: w.link ?? '',
    createdAt: w.createdAt ?? nowIso(),
  }
}

const links: EntityStore<LinkItem, NewLink> = {
  async list() {
    // createdAt 未建索引,不能用 orderBy;取全量后内存排序
    const all = await db.links.toArray()
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async create(input) {
    const link: LinkItem = {
      id: uid(),
      name: input.name,
      url: input.url,
      group: input.group ?? '未分组',
      createdAt: nowIso(),
    }
    await db.links.add(link)
    return link
  },
  async update(id, patch) {
    await db.links.update(id, patch as UpdateSpec<LinkItem>)
    const link = await db.links.get(id)
    if (!link) throw new Error(`链接不存在: ${id}`)
    return link
  },
  async remove(id) {
    await db.links.delete(id)
  },
}

const habits: EntityStore<Habit, NewHabit> = {
  async list() {
    const all = await db.habits.toArray()
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async create(input) {
    const habit: Habit = {
      id: uid(),
      name: input.name,
      icon: input.icon,
      color: input.color,
      dates: input.dates ?? [],
      archived: input.archived ?? false,
      createdAt: nowIso(),
    }
    await db.habits.add(habit)
    return habit
  },
  async update(id, patch) {
    await db.habits.update(id, patch as UpdateSpec<Habit>)
    const habit = await db.habits.get(id)
    if (!habit) throw new Error(`习惯不存在: ${id}`)
    return habit
  },
  async remove(id) {
    await db.habits.delete(id)
  },
}

const milestones: EntityStore<Milestone, NewMilestone> = {
  async list() {
    const all = await db.milestones.toArray()
    return all.sort((a, b) => a.date.localeCompare(b.date))
  },
  async create(input) {
    const milestone: Milestone = {
      id: uid(),
      title: input.title,
      date: input.date,
      emoji: input.emoji ?? '🎯',
      createdAt: nowIso(),
    }
    await db.milestones.add(milestone)
    return milestone
  },
  async update(id, patch) {
    await db.milestones.update(id, patch as UpdateSpec<Milestone>)
    const milestone = await db.milestones.get(id)
    if (!milestone) throw new Error(`倒数日不存在: ${id}`)
    return milestone
  },
  async remove(id) {
    await db.milestones.delete(id)
  },
}

const dailies: EntityStore<Daily, NewDaily> = {
  async list() {
    const all = await db.dailies.toArray()
    return all.sort((a, b) => a.date.localeCompare(b.date))
  },
  async create(input) {
    const existing = await db.dailies.where('date').equals(input.date).first()
    if (existing) {
      // 每天只保留一条:已存在则更新
      return dailies.update(existing.id, { mood: input.mood, note: input.note ?? '' })
    }
    const daily: Daily = {
      id: uid(),
      date: input.date,
      mood: input.mood,
      note: input.note ?? '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await db.dailies.add(daily)
    return daily
  },
  async update(id, patch) {
    await db.dailies.update(id, patch as UpdateSpec<Daily>)
    const daily = await db.dailies.get(id)
    if (!daily) throw new Error(`每日记录不存在: ${id}`)
    return daily
  },
  async remove(id) {
    await db.dailies.delete(id)
  },
}

const goals: EntityStore<Goal, NewGoal> = {
  async list() {
    const all = await db.goals.toArray()
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async create(input) {
    const goal: Goal = {
      id: uid(),
      title: input.title,
      emoji: input.emoji ?? '🎯',
      color: input.color ?? 'cyan',
      tag: input.tag ?? null,
      mode: input.mode ?? 'auto',
      manualProgress: input.manualProgress ?? 0,
      deadline: input.deadline ?? null,
      createdAt: nowIso(),
    }
    await db.goals.add(goal)
    return goal
  },
  async update(id, patch) {
    await db.goals.update(id, patch as UpdateSpec<Goal>)
    const goal = await db.goals.get(id)
    if (!goal) throw new Error(`目标不存在: ${id}`)
    return goal
  },
  async remove(id) {
    await db.goals.delete(id)
  },
}

// v6:新增 memos(碎碎念)/ expenses(记账)表
db.version(6).stores({
  memos: 'id, createdAt, pinned',
  expenses: 'id, date, kind',
})

// v5:新增 works(作品集)表
db.version(5).stores({
  works: 'id, createdAt',
})

export const localAdapter: DataAdapter = { tasks, notes, links, habits, milestones, dailies, goals, works, memos, expenses }
export { LOCAL_USER_ID, db }
