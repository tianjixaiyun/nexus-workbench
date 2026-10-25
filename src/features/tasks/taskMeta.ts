import type { TaskPriority, TaskRecurrence, TaskStatus } from '@/lib/data/types'

/** 优先级/状态的展示元数据(徽标配色、文案),列表/看板/仪表盘共用 */
export const PRIORITY_META: Record<TaskPriority, { label: string; tone: 'rose' | 'amber' | 'cyan' }> = {
  high: { label: '高', tone: 'rose' },
  medium: { label: '中', tone: 'amber' },
  low: { label: '低', tone: 'cyan' },
}

export const STATUS_META: Record<TaskStatus, { label: string; tone: 'slate' | 'cyan' | 'emerald'; dot: string }> = {
  todo: { label: '待办', tone: 'slate', dot: 'bg-slate-400' },
  doing: { label: '进行中', tone: 'cyan', dot: 'bg-accent-solid' },
  done: { label: '已完成', tone: 'emerald', dot: 'bg-emerald-400' },
}

export const RECURRENCE_LABEL: Record<TaskRecurrence, string> = {
  none: '',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
}

export const PRIORITY_STRIPE: Record<TaskPriority, string> = {
  high: 'bg-rose-400',
  medium: 'bg-amber-400',
  low: 'bg-accent-solid',
}

export const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

export const ALL_STATUSES: TaskStatus[] = ['todo', 'doing', 'done']
