/** 统一备份入口；Symbol 不参与 JSON 序列化，只把固定账号传给云端 adapter。 */
export const BACKUP_IMPORT_USER = Symbol('nexus-backup-import-user')
export const BACKUP_IMPORT_EVENT = 'nexus:backup-import'

export function requestBackupImport(): void {
  window.dispatchEvent(new Event(BACKUP_IMPORT_EVENT))
}
