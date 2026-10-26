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

/** 单个实体的通用增删改查接口 */
export interface EntityStore<T, New> {
  list(): Promise<T[]>
  create(item: New): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}

/**
 * 数据访问层统一接口。
 * localAdapter(IndexedDB)与 cloudAdapter(Supabase)都实现它,
 * 业务代码只面向此接口 —— 以后换存储方案只改 adapter,不动业务代码。
 */
export interface DataAdapter {
  tasks: EntityStore<Task, NewTask>
  notes: EntityStore<Note, NewNote>
  links: EntityStore<LinkItem, NewLink>
  habits: EntityStore<Habit, NewHabit>
  milestones: EntityStore<Milestone, NewMilestone>
  dailies: EntityStore<Daily, NewDaily>
  goals: EntityStore<Goal, NewGoal>
  works: EntityStore<WorkItem, NewWork>
  memos: EntityStore<Memo, NewMemo>
  expenses: EntityStore<Expense, NewExpense>
  contacts: EntityStore<Contact, NewContact>
}
