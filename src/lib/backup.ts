import { isCloudMode } from './config'
import { useSettingsStore } from '../stores/settingsStore'
import { toast } from '../stores/toastStore'
import type {
  WorkItem, Daily, Goal, Habit, LinkItem, Milestone, Note, Task, Memo, Expense, Contact } from './data/types'
import { dataAdapter } from './data'
import { db } from './data/localAdapter'

const BACKUP_VERSION = 9

export interface BackupFile {
  app: 'nexus-workbench'
  version: number
  exportedAt: string
  tasks: Task[]
  notes: Note[]
  links: LinkItem[]
  habits: Habit[]
  milestones: Milestone[]
  dailies: Daily[]
  goals: Goal[]
  works?: WorkItem[]
  memos?: Memo[]
  expenses?: Expense[]
  contacts?: Contact[]
}

/** 导出全部数据为 JSON 备份文件 */
export async function exportData(): Promise<void> {
  const [tasks, notes, links, habits, milestones, dailies, goals, works, memos, expenses, contacts] = await Promise.all([
    dataAdapter.tasks.list(),
    dataAdapter.notes.list(),
    dataAdapter.links.list(),
    dataAdapter.habits.list(),
    dataAdapter.milestones.list(),
    dataAdapter.dailies.list(),
    dataAdapter.goals.list(),
    dataAdapter.works.list(),
    dataAdapter.memos.list(),
    dataAdapter.expenses.list(),
    dataAdapter.contacts.list(),
  ])
  const backup: BackupFile = {
    app: 'nexus-workbench',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    notes,
    links,
    habits,
    milestones,
    dailies,
    goals,
    works,
    memos,
    expenses,
    contacts,
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  // 记录导出时间,供本地模式的「N 天未备份」提醒判断
  useSettingsStore.getState().markExported()
  toast.success('备份已导出', 'JSON 文件已保存到下载目录')
}

function parseBackup(raw: unknown): BackupFile {
  const b = raw as BackupFile
  if (!b || b.app !== 'nexus-workbench' || !Array.isArray(b.tasks)) {
    throw new Error('文件格式不对,请选择本应用导出的 JSON 备份')
  }
  return b
}

/**
 * 导入备份(整库替换,导入前请先导出当前数据做备份)。
 * 本地模式:按原 ID 整批写入 IndexedDB;云端模式:逐条重建。
 */
export async function importData(file: File): Promise<{ counts: string }> {
  const backup = parseBackup(JSON.parse(await file.text()))
  const n = (arr: unknown[]) => arr.length

  if (!isCloudMode) {
    await // @ts-expect-error Dexie 类型签名最多标注 7 张表,运行时支持更多
      db.transaction('rw', db.tasks, db.notes, db.links, db.habits, db.milestones, db.dailies, db.goals, db.works, db.memos, db.expenses, db.contacts, async () => {
      await Promise.all([
        db.tasks.clear(),
        db.notes.clear(),
        db.links.clear(),
        db.habits.clear(),
        db.milestones.clear(),
        db.dailies.clear(),
        db.goals.clear(),
        db.works.clear(),
        db.memos.clear(),
        db.expenses.clear(),
        db.contacts.clear(),
      ])
      if (backup.tasks.length) await db.tasks.bulkPut(backup.tasks)
      if (backup.notes.length) await db.notes.bulkPut(backup.notes)
      if (backup.links.length) await db.links.bulkPut(backup.links)
      if (backup.habits.length) await db.habits.bulkPut(backup.habits)
      if (backup.milestones.length) await db.milestones.bulkPut(backup.milestones)
      if (backup.dailies.length) await db.dailies.bulkPut(backup.dailies)
      if (backup.goals.length) await db.goals.bulkPut(backup.goals)
      if (backup.works?.length) await db.works.bulkPut(backup.works)
      if (backup.memos?.length) await db.memos.bulkPut(backup.memos)
      if (backup.expenses?.length) await db.expenses.bulkPut(backup.expenses)
      if (backup.contacts?.length) await db.contacts.bulkPut(backup.contacts)
    })
  } else {
    // 云端:逐条重建(保留创建时间的展示字段由服务端生成)
    for (const t of backup.tasks) await dataAdapter.tasks.create({ ...t, title: t.title })
    for (const item of backup.notes) await dataAdapter.notes.create({ title: item.title, content: item.content, color: item.color, pinned: item.pinned })
    for (const l of backup.links) await dataAdapter.links.create({ name: l.name, url: l.url, group: l.group })
    for (const h of backup.habits) await dataAdapter.habits.create({ name: h.name, icon: h.icon, color: h.color, dates: h.dates })
    for (const m of backup.milestones) await dataAdapter.milestones.create({ title: m.title, date: m.date, emoji: m.emoji })
    for (const d of backup.dailies) await dataAdapter.dailies.create({ date: d.date, mood: d.mood, note: d.note })
    for (const g of backup.goals) await dataAdapter.goals.create({ title: g.title, emoji: g.emoji, color: g.color, tag: g.tag, mode: g.mode, manualProgress: g.manualProgress, deadline: g.deadline })
    for (const w of backup.works ?? []) await dataAdapter.works.create({ title: w.title, category: w.category, year: w.year, description: w.description, images: w.images, link: w.link })
    for (const m of backup.memos ?? []) await dataAdapter.memos.create({ content: m.content, tags: m.tags, pinned: m.pinned })
    for (const e of backup.expenses ?? []) await dataAdapter.expenses.create({ kind: e.kind, amount: e.amount, category: e.category, note: e.note, date: e.date })
    for (const c of backup.contacts ?? []) await dataAdapter.contacts.create({ name: c.name, company: c.company, role: c.role, tags: c.tags, email: c.email, phone: c.phone, note: c.note, lastContactAt: c.lastContactAt, nextFollowUp: c.nextFollowUp })
  }

  const counts = `任务 ${n(backup.tasks)} · 笔记 ${n(backup.notes)} · 链接 ${n(backup.links)} · 习惯 ${n(backup.habits)} · 倒数日 ${n(backup.milestones)} · 作品 ${n(backup.works ?? [])} · 碎碎念 ${n(backup.memos ?? [])} · 记账 ${n(backup.expenses ?? [])} · 人脉 ${n(backup.contacts ?? [])}`
  toast.success('导入成功', `${counts} —— 页面即将刷新`)

  return { counts }
}
