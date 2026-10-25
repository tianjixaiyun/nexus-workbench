import { supabase } from '../config'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useNoteStore } from '@/stores/noteStore'
import { useTaskStore } from '@/stores/taskStore'

/**
 * 云端模式的实时同步(协作地基):
 * 订阅 Supabase Postgres Changes,任何设备上的改动都会实时推送过来,
 * 本地按表去抖后重新拉取 —— 多标签页/多设备保持一致。
 *
 * 依赖 schema.sql 末尾的 supabase_realtime publication 配置。
 */

const TABLE_TO_STORE = {
  tasks: () => useTaskStore.getState().fetch(),
  notes: () => useNoteStore.getState().fetch(),
  links: () => useLinkStore.getState().fetch(),
  habits: () => useHabitStore.getState().fetch(),
  milestones: () => useMilestoneStore.getState().fetch(),
} as const

type TableName = keyof typeof TABLE_TO_STORE

const pending = new Set<TableName>()
let timer: ReturnType<typeof setTimeout> | null = null

function scheduleRefresh(table: TableName) {
  pending.add(table)
  if (timer) return
  // 去抖:连发的批量改动(如导入、拖拽排序)合并成一次拉取
  timer = setTimeout(() => {
    timer = null
    for (const t of pending) TABLE_TO_STORE[t]()
    pending.clear()
  }, 800)
}

let subscribed = false

/** 云端模式登录后调用;重复调用无副作用 */
export function startRealtime(): void {
  if (subscribed || !supabase) return
  subscribed = true

  const channel = supabase.channel('nexus-realtime')
  for (const table of Object.keys(TABLE_TO_STORE) as TableName[]) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => scheduleRefresh(table))
  }
  channel.subscribe((status: string) => {
    if (status === 'CHANNEL_ERROR') {
      console.error('实时同步连接失败,数据仍会在下次操作时刷新')
    }
  })
}
