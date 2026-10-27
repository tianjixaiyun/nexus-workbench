import { isCloudMode } from './config'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore } from '../stores/authStore'
import { toast } from '../stores/toastStore'
import { dataAdapter } from './data'
import { db } from './data/localAdapter'
import { FOCUS_STATE_KEY } from './focusTimer'
import { collectDeviceBackup, restoreDeviceBackup, type DeviceBackupKey } from './deviceBackup'
import { BACKUP_IMPORT_USER } from './backupImport'
import { BACKUP_COLLECTIONS, BACKUP_LABELS, BACKUP_VERSION, validateBackup, type BackupCollection, type BackupFile, type PreparedBackup } from './backupValidation'
import { todayStr } from './utils'

export type { BackupFile } from './backupValidation'
export interface ImportOptions {
  collections?: BackupCollection[]
  deviceKeys?: DeviceBackupKey[]
  expectedUserId?: string | null
}
export interface ImportResult { counts: string; deviceWarning?: string }

function accountGuard(expected?: string | null) {
  const userId = isCloudMode ? useAuthStore.getState().user?.id : null
  if (isCloudMode && (!userId || expected !== undefined && expected !== userId)) throw new Error('账号已变化或尚未登录，请重新选择备份文件后预览')
  let changed = false
  const stop = isCloudMode ? useAuthStore.subscribe((state) => { if (state.user?.id !== userId) changed = true }) : () => undefined
  return {
    userId,
    assert: () => { if (changed || isCloudMode && useAuthStore.getState().user?.id !== userId) throw new Error('账号会话已变化，已停止后续导入') },
    stop,
  }
}

export function assertNoActiveFocus(): void {
  const raw = localStorage.getItem(FOCUS_STATE_KEY)
  if (!raw) return
  let timer: { sessionId?: unknown; running?: unknown }
  try { timer = JSON.parse(raw) ?? {} } catch { throw new Error('专注快照已损坏，请先到专注页面重置后再导入') }
  if (timer.sessionId || timer.running === true) throw new Error('存在运行或暂停的专注，请先到专注页面重置，再导入备份')
}

export async function readBackup(file: File): Promise<PreparedBackup> {
  if (file.size > 50 * 1024 * 1024) throw new Error('备份超过 50 MB，请先拆分过大的图片内容再导入；当前数据未改动')
  let value: unknown
  try { value = JSON.parse(await file.text()) } catch { throw new Error('文件不是有效 JSON，当前数据未改动') }
  return validateBackup(value)
}

export async function currentBackupCounts(): Promise<Record<BackupCollection, number>> {
  const guard = accountGuard()
  try {
    const entries = await Promise.all(BACKUP_COLLECTIONS.map(async (key) => [key, (await dataAdapter[key].list()).length] as const))
    guard.assert()
    return Object.fromEntries(entries) as Record<BackupCollection, number>
  } finally { guard.stop() }
}

export async function createBackup(): Promise<BackupFile> {
  const guard = accountGuard()
  try {
    const entries = await Promise.all(BACKUP_COLLECTIONS.map(async (key) => [key, await dataAdapter[key].list()] as const))
    guard.assert()
    const backup = { app: 'nexus-workbench', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...Object.fromEntries(entries), deviceData: collectDeviceBackup() }
    return validateBackup(backup).backup
  } finally { guard.stop() }
}

/** 导出列明范围的业务数据和本机补充数据，不包含认证/PIN/缓存或活动计时。 */
export async function exportData(): Promise<void> {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `nexus-backup-${todayStr()}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  useSettingsStore.getState().markExported()
  toast.success('备份下载已请求', '请确认浏览器已保存 JSON 文件，再清理或迁移数据')
}

/** 所有来源都先校验；UI 确认后传入所选集合，旧备份缺失集合默认保留。 */
export async function importPreparedBackup(prepared: PreparedBackup, options: ImportOptions = {}): Promise<ImportResult> {
  const { backup } = validateBackup(prepared.backup)
  const selected = [...new Set(options.collections ?? prepared.presentCollections)]
  if (selected.some((key) => !BACKUP_COLLECTIONS.includes(key))) throw new Error('恢复集合不受支持')
  const deviceKeys = [...new Set(options.deviceKeys ?? [])]
  if (deviceKeys.length && !backup.deviceData) throw new Error('这份旧备份没有本机补充数据')
  if (deviceKeys.some((key) => !Object.hasOwn(backup.deviceData ?? {}, key))) throw new Error('所选本机补充数据不在备份内，当前数据未改动')
  if (!selected.length && !deviceKeys.length) throw new Error('请至少选择一项要恢复的数据')
  assertNoActiveFocus()
  const guard = accountGuard(options.expectedUserId)
  try {
    if (!isCloudMode) {
      if (selected.length) await db.transaction('rw', selected.map((key) => db.table(key)), async () => {
        guard.assert()
        assertNoActiveFocus()
        for (const key of selected) {
          const table = db.table(key)
          await table.clear()
          await table.bulkPut(backup[key])
        }
        guard.assert()
        assertNoActiveFocus()
      })
    } else {
      let imported = 0
      for (const key of selected) {
        const create = dataAdapter[key].create as (item: Record<PropertyKey, unknown>) => Promise<unknown>
        for (let index = 0; index < backup[key].length; index++) {
          try {
            guard.assert()
            assertNoActiveFocus()
            await create({ ...backup[key][index], [BACKUP_IMPORT_USER]: guard.userId })
            imported++
            guard.assert()
          } catch (error) {
            const cause = error instanceof Error ? error.message : '写入失败'
            throw new Error(`云端追加中断：已成功写入 ${imported} 条；${BACKUP_LABELS[key]}第 ${index + 1} 条未确认：${cause}。既有记录和成功写入的记录均保留，请核对后处理，避免直接重复导入。`)
          }
        }
      }
    }
    const counts = selected.map((key) => `${BACKUP_LABELS[key]} ${backup[key].length}`).join(' · ') || '未改动业务集合'
    let deviceWarning: string | undefined
    if (deviceKeys.length) {
      try {
        guard.assert()
        assertNoActiveFocus()
        restoreDeviceBackup(backup.deviceData!, deviceKeys)
      } catch (error) {
        deviceWarning = `业务集合已完成恢复；${error instanceof Error ? error.message : '本机补充数据恢复失败'}。不要重复导入业务集合。`
      }
    }
    return { counts, ...(deviceWarning ? { deviceWarning } : {}) }
  } finally { guard.stop() }
}

export async function importData(file: File, options?: ImportOptions): Promise<ImportResult> {
  return importPreparedBackup(await readBackup(file), options)
}
