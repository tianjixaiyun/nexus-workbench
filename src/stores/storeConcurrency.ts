import { isCloudMode } from '@/lib/config'
import { useAuthStore } from './authStore'
import { useSyncStore } from './syncStore'

/** 每个 store 独立拥有请求序号；创建 helper 时不读取 auth，避免模块循环初始化。 */
export function createStoreFetchGuard() {
  let generation = 0
  let sequence = 0
  return {
    reset() { generation++; sequence++ },
    begin(rows: readonly unknown[], readRows: () => readonly unknown[]) {
      const epoch = generation
      const request = ++sequence
      const cloud = isCloudMode
      const session = cloud ? useAuthStore.getState() : null
      const owner = session?.user?.id ?? null
      const ready = session?.ready ?? true
      const isCurrent = () => {
        if (epoch !== generation || request !== sequence) return false
        if (!cloud) return true
        const current = useAuthStore.getState()
        return current.ready === ready && (current.user?.id ?? null) === owner
      }
      return {
        isCurrent,
        canReplaceRows: () => readRows() === rows,
        assertReady() { if (cloud && (!ready || !owner)) throw new Error('请先完成云端登录，再读取业务数据') },
      }
    },
  }
}

/** 当前读取失败保留已有数组，独立显示错误；单表成功不冒充整轮同步成功。 */
export function reportStoreReadError(label: string, cause: unknown): void {
  const detail = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '读取失败，请检查存储与连接状态'
  const offline = isCloudMode && typeof navigator !== 'undefined' && navigator.onLine === false
  useSyncStore.setState({ status: offline ? 'offline' : 'error', message: label + '读取失败：' + detail + '。已保留当前记录，请刷新重试。' })
}

/** Realtime 可能先返回新记录；慢创建响应不能重复插入，也不能覆盖更新后的实体。 */
export function insertCreatedById<T extends { id: string }>(rows: T[], created: T, prepend = false): T[] {
  const existing = rows.findIndex(row => row.id === created.id)
  if (existing !== -1) return rows.filter((row, index) => row.id !== created.id || index === existing)
  return prepend ? [created, ...rows] : [...rows, created]
}
