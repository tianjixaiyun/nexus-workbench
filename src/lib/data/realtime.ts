import type { RealtimeChannel } from '@supabase/supabase-js'
import { isCloudMode, supabase } from '../config'
import { dataAdapter } from './index'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { useTaskStore } from '@/stores/taskStore'
import { useNoteStore } from '@/stores/noteStore'
import { useLinkStore } from '@/stores/linkStore'
import { useHabitStore } from '@/stores/habitStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useDailyStore } from '@/stores/dailyStore'
import { useGoalStore } from '@/stores/goalStore'
import { useWorkStore } from '@/stores/workStore'
import { useMemoStore } from '@/stores/memoStore'
import { useExpenseStore } from '@/stores/expenseStore'
import { useContactStore } from '@/stores/contactStore'

const modules = {
  tasks: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.tasks.list>>) => useTaskStore.setState({ tasks: rows, loaded: true }), reset: () => useTaskStore.getState().reset() },
  notes: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.notes.list>>) => useNoteStore.setState({ notes: rows, loaded: true }), reset: () => useNoteStore.getState().reset() },
  links: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.links.list>>) => useLinkStore.setState({ links: rows, loaded: true }), reset: () => useLinkStore.getState().reset() },
  habits: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.habits.list>>) => useHabitStore.setState({ habits: rows, loaded: true }), reset: () => useHabitStore.getState().reset() },
  milestones: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.milestones.list>>) => useMilestoneStore.setState({ milestones: rows, loaded: true }), reset: () => useMilestoneStore.getState().reset() },
  dailies: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.dailies.list>>) => useDailyStore.setState({ dailies: rows, loaded: true }), reset: () => useDailyStore.getState().reset() },
  goals: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.goals.list>>) => useGoalStore.setState({ goals: rows, loaded: true }), reset: () => useGoalStore.getState().reset() },
  works: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.works.list>>) => useWorkStore.setState({ works: rows, loaded: true }), reset: () => useWorkStore.getState().reset() },
  memos: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.memos.list>>) => useMemoStore.setState({ memos: rows, loaded: true }), reset: () => useMemoStore.getState().reset() },
  expenses: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.expenses.list>>) => useExpenseStore.setState({ expenses: rows, loaded: true }), reset: () => useExpenseStore.getState().reset() },
  contacts: { apply: (rows: Awaited<ReturnType<typeof dataAdapter.contacts.list>>) => useContactStore.setState({ contacts: rows, loaded: true }), reset: () => useContactStore.getState().reset() },
}
type Table = keyof typeof modules
let generation = 0
let refreshSequence = 0
let realtimeLive = false
let cleanup: (() => void) | null = null
let subscribedOwner: string | null = null
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false

export function resetCloudData(): void {
  for (const value of Object.values(modules)) value.reset()
  useSyncStore.setState({ lastSyncedAt: null, refreshing: false })
}

/** 全部读取成功后再应用；失败保留旧数据。代次和账号检查阻止旧请求回写。 */
export async function refreshCloudData(): Promise<void> {
  if (!isCloudMode || !supabase) return
  const owner = useAuthStore.getState().user?.id
  if (!owner) throw new Error('请先登录后刷新云端数据')
  if (!online()) { useSyncStore.setState({ status: 'offline', message: '当前离线，联网后可重试', refreshing: false }); throw new Error('当前离线，无法刷新云端数据') }
  const epoch = generation
  const request = ++refreshSequence
  const current = () => epoch === generation && request === refreshSequence && useAuthStore.getState().user?.id === owner
  useSyncStore.setState({ refreshing: true, message: null })
  try {
    const tables = Object.keys(modules) as Table[]
    const rows = await Promise.all(tables.map(table => dataAdapter[table].list()))
    if (!current()) return
    tables.forEach((table, i) => {
      // 表名与行类型由同一索引绑定；对外状态仍保持各表的实体类型。
      ;(modules[table].apply as (value: typeof rows[number]) => void)(rows[i])
    })
    useSyncStore.setState({ status: realtimeLive ? 'live' : (online() ? 'connecting' : 'offline'), lastSyncedAt: new Date().toISOString(), refreshing: false, message: null })
  } catch (cause) {
    if (!current()) return
    const message = cause instanceof Error ? cause.message : '云端数据读取失败'
    useSyncStore.setState({ status: online() ? 'error' : 'offline', message: `刷新失败：${message}。已保留上次数据。`, refreshing: false })
    throw new Error(message)
  }
}

export function stopRealtime(): void {
  realtimeLive = false
  generation++
  refreshSequence++
  cleanup?.()
  cleanup = null
  subscribedOwner = null
  useSyncStore.setState({ status: isCloudMode ? (online() ? 'connecting' : 'offline') : 'local', message: isCloudMode ? '实时服务未连接' : null, refreshing: false })
}

/** 同账号重复启动只复用订阅；返回的旧 cleanup 无法关闭新账号连接。 */
export function startRealtime(): (() => void) | void {
  if (!supabase || !isCloudMode) { useSyncStore.setState({ status: 'local' }); return }
  const client = supabase
  const owner = useAuthStore.getState().user?.id
  if (!owner) return
  if (cleanup && subscribedOwner === owner) {
    const epoch = generation
    return () => { if (generation === epoch) stopRealtime() }
  }
  stopRealtime()
  subscribedOwner = owner
  const epoch = generation
  let channel: RealtimeChannel | null = null
  let channelEpoch = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const current = () => generation === epoch && useAuthStore.getState().user?.id === owner
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null }
  const removeChannel = () => { realtimeLive = false; channelEpoch++; const old = channel; channel = null; if (old) void client.removeChannel(old).catch(() => {}) }
  const schedule = () => {
    if (!current() || timer) return
    timer = setTimeout(() => { timer = null; if (current()) void refreshCloudData().catch(() => {}) }, 500)
  }
  const connect = () => {
    if (!current()) return
    clearTimer(); removeChannel()
    if (!online()) { useSyncStore.setState({ status: 'offline', message: '当前离线，联网后重新连接' }); return }
    const token = channelEpoch
    useSyncStore.setState({ status: 'connecting', message: '正在连接实时服务' })
    channel = client.channel(`nexus-realtime-${owner}`)
    for (const table of Object.keys(modules) as Table[]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${owner}` }, schedule)
    }
    channel.subscribe(status => {
      if (!current() || token !== channelEpoch) return
      if (status === 'SUBSCRIBED') { realtimeLive = true; useSyncStore.setState({ status: 'live', message: null }); schedule() }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        realtimeLive = false
        useSyncStore.setState({ status: online() ? 'error' : 'offline', message: '实时连接中断，可手动刷新数据；服务将尝试重新连接' })
      }
    })
  }
  const offline = () => { if (current()) { clearTimer(); removeChannel(); useSyncStore.setState({ status: 'offline', message: '当前离线，联网后重新连接' }) } }
  const reconnect = () => { if (current()) connect() }
  // owner 过滤的硬删除事件可能不携带 user_id；返回页面时重读受 RLS 保护的数据。
  const returnToPage = () => { if (current() && online() && (typeof document === 'undefined' || document.visibilityState === 'visible')) schedule() }
  cleanup = () => { window.removeEventListener('focus', returnToPage); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', returnToPage); clearTimer(); removeChannel(); window.removeEventListener('offline', offline); window.removeEventListener('online', reconnect) }
  window.addEventListener('focus', returnToPage)
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', returnToPage)
  window.addEventListener('offline', offline)
  window.addEventListener('online', reconnect)
  connect()
  return () => { if (generation === epoch) stopRealtime() }
}
