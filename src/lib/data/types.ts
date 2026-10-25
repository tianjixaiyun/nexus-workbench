export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
/** 重复规则:完成后自动生成下一次 */
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export const TASK_RECURRENCES: { value: TaskRecurrence; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  /** YYYY-MM-DD,可为空 */
  dueDate: string | null
  /** 标记完成的时间(ISO),未完成为 null */
  completedAt: string | null
  /** 子任务清单 */
  subtasks: Subtask[]
  /** 标签 */
  tags: string[]
  /** 软删除时间(回收站),正常数据为 null */
  deletedAt: string | null
  /** 重复规则 */
  recurrence: TaskRecurrence
  /** 累计专注分钟数(番茄钟累加) */
  focusMinutes: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type NewTask = Pick<Task, 'title'> &
  Partial<
    Pick<
      Task,
      | 'description'
      | 'status'
      | 'priority'
      | 'dueDate'
      | 'sortOrder'
      | 'completedAt'
      | 'subtasks'
      | 'tags'
      | 'recurrence'
      | 'focusMinutes'
    >
  >

export const NOTE_COLORS = ['cyan', 'violet', 'amber', 'emerald', 'rose', 'slate'] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export interface Note {
  id: string
  title: string
  content: string
  color: NoteColor
  pinned: boolean
  /** 软删除时间(回收站),正常数据为 null */
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type NewNote = Pick<Note, 'title' | 'content'> &
  Partial<Pick<Note, 'color' | 'pinned'>>

export interface LinkItem {
  id: string
  name: string
  url: string
  group: string
  createdAt: string
}

export type NewLink = Pick<LinkItem, 'name' | 'url'> & Partial<Pick<LinkItem, 'group'>>

// ==================== 习惯打卡 ====================

export const HABIT_COLORS = ['cyan', 'violet', 'emerald', 'amber', 'rose'] as const
export type HabitColor = (typeof HABIT_COLORS)[number]

export interface Habit {
  id: string
  name: string
  /** emoji 图标 */
  icon: string
  color: HabitColor
  /** 已打卡的日期列表(YYYY-MM-DD) */
  dates: string[]
  archived: boolean
  createdAt: string
}

export type NewHabit = Pick<Habit, 'name' | 'icon' | 'color'> &
  Partial<Pick<Habit, 'dates' | 'archived'>>

// ==================== 倒数日/纪念日 ====================

export interface Milestone {
  id: string
  title: string
  /** 目标日期 YYYY-MM-DD */
  date: string
  emoji: string
  createdAt: string
}

export type NewMilestone = Pick<Milestone, 'title' | 'date'> &
  Partial<Pick<Milestone, 'emoji'>>

// ==================== 每日心情(每日复盘) ====================

export const MOODS = [
  { value: 1, emoji: '😫', label: '很糟' },
  { value: 2, emoji: '😕', label: '不太好' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 4, emoji: '😊', label: '不错' },
  { value: 5, emoji: '🤩', label: '超棒' },
] as const

export interface Daily {
  id: string
  /** YYYY-MM-DD,每天一条 */
  date: string
  /** 心情 1-5 */
  mood: number
  /** 一句话复盘 */
  note: string
  createdAt: string
  updatedAt: string
}

export type NewDaily = { date: string; mood: number; note?: string }

// ==================== 目标(顶层) ====================

export const GOAL_COLORS = ['cyan', 'violet', 'emerald', 'amber', 'rose'] as const
export type GoalColor = (typeof GOAL_COLORS)[number]

export interface Goal {
  id: string
  title: string
  emoji: string
  color: GoalColor
  /** 自动模式:关联的标签,进度 = 打了该标签的任务中已完成占比 */
  tag: string | null
  /** auto = 按标签自动统计;manual = 手动进度条 */
  mode: 'auto' | 'manual'
  /** 手动进度 0-100 */
  manualProgress: number
  /** 目标截止日(可空) */
  deadline: string | null
  createdAt: string
}

export type NewGoal = Pick<Goal, 'title'> &
  Partial<Pick<Goal, 'emoji' | 'color' | 'tag' | 'mode' | 'manualProgress' | 'deadline'>>
