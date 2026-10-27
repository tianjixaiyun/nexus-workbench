import { create } from 'zustand'
import { isCloudMode } from '@/lib/config'

export type SyncStatus = 'local' | 'connecting' | 'live' | 'offline' | 'error'
interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  message: string | null
  refreshing: boolean
}
/** live 仅代表 Realtime 已连接；lastSyncedAt 仅记录整轮读取成功时间。 */
export const useSyncStore = create<SyncState>(() => ({
  status: isCloudMode ? 'connecting' : 'local',
  lastSyncedAt: null,
  message: isCloudMode ? '等待登录后连接实时服务' : null,
  refreshing: false,
}))
