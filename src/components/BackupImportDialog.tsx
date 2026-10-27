import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FileDown, FileUp, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { isCloudMode } from '@/lib/config'
import { currentBackupCounts, exportData, importPreparedBackup, readBackup, type ImportResult } from '@/lib/backup'
import { BACKUP_IMPORT_EVENT } from '@/lib/backupImport'
import { BACKUP_COLLECTIONS, BACKUP_LABELS, type BackupCollection, type PreparedBackup } from '@/lib/backupValidation'
import { DEVICE_BACKUP_LABELS, type DeviceBackupKey } from '@/lib/deviceBackup'
import { useAuthStore } from '@/stores/authStore'
import { useFocusStore } from '@/stores/focusStore'
import { cn } from '@/lib/utils'

export function BackupImportDialog() {
  const inputRef = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const busyRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null)
  const [counts, setCounts] = useState<Partial<Record<BackupCollection, number>>>({})
  const [selected, setSelected] = useState<BackupCollection[]>([])
  const [deviceKeys, setDeviceKeys] = useState<DeviceBackupKey[]>([])
  const [expectedUser, setExpectedUser] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const activeFocus = useFocusStore((state) => !!state.timer.sessionId || state.timer.running)

  const chooseFile = () => {
    if (busyRef.current) return
    generation.current++
    setOpen(true)
    setPrepared(null)
    setResult(null)
    setNotice('')
    setReading(false)
    setConfirmed(false)
    inputRef.current?.click()
  }
  const close = () => {
    if (busyRef.current) return
    generation.current++
    setOpen(false)
  }
  useEffect(() => {
    window.addEventListener(BACKUP_IMPORT_EVENT, chooseFile)
    return () => { generation.current++; window.removeEventListener(BACKUP_IMPORT_EVENT, chooseFile) }
    // 事件回调仅使用稳定 refs 与 React setters，避免文件选择期间重复订阅。
  }, [])

  const inspect = async (file: File) => {
    const token = ++generation.current
    const owner = useAuthStore.getState().user?.id ?? null
    setOpen(true)
    setReading(true)
    setNotice('')
    setPrepared(null)
    setResult(null)
    setConfirmed(false)
    setDeviceKeys([])
    setFileName(file.name)
    try {
      const candidate = await readBackup(file)
      const current = await currentBackupCounts()
      if (generation.current !== token) return
      if (isCloudMode && useAuthStore.getState().user?.id !== owner) throw new Error('预览期间账号已变化，请重新选择文件')
      setPrepared(candidate)
      setCounts(current)
      setSelected(candidate.presentCollections)
      setExpectedUser(owner)
    } catch (error) {
      if (generation.current === token) setNotice(error instanceof Error ? error.message : '读取失败，当前数据未改动')
    } finally { if (generation.current === token) setReading(false) }
  }
  const perform = async () => {
    if (!prepared || !confirmed || busyRef.current || activeFocus) return
    busyRef.current = true
    setBusy(true)
    setNotice('')
    try {
      const restored = await importPreparedBackup(prepared, { collections: selected, deviceKeys, expectedUserId: expectedUser })
      setResult(restored)
    } catch (error) {
      setConfirmed(false)
      const message = error instanceof Error ? error.message : '恢复失败，请核对数据后处理'
      if (isCloudMode) {
        setPrepared(null)
        setSelected([])
        setDeviceKeys([])
        setNotice(`${message} 本轮云端预览已作废；云端可能已有写入，请先核对当前记录，再重新选择文件预览。不要直接重复追加。`)
      } else setNotice(message)
    } finally { busyRef.current = false; setBusy(false) }
  }
  const backupCurrent = async () => {
    try { await exportData(); setNotice('当前备份下载已请求，请确认文件已保存。') }
    catch (error) { setNotice(error instanceof Error ? error.message : '导出当前备份失败') }
  }
  const availableDeviceKeys = Object.keys(prepared?.backup.deviceData ?? {}) as DeviceBackupKey[]

  return <>
    <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file && !busyRef.current) void inspect(file)
    }} />
    <Modal open={open} onClose={close} title="恢复备份 · 先预览再确认" className="max-w-2xl">
      {result ? <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-success">业务集合恢复完成：{result.counts}</p>
        {result.deviceWarning && <p role="alert" className="rounded-xl border border-line-2 bg-surface-2 p-3 text-sm leading-relaxed text-warn">{result.deviceWarning}</p>}
        {!result.deviceWarning && deviceKeys.length > 0 && <p className="text-xs text-txt-secondary">所选本机补充数据已分步恢复。</p>}
        <p className="text-xs leading-relaxed text-txt-muted">刷新应用后使用恢复内容；本次已执行，不要重复导入同一份云端备份。</p>
        <Button variant="primary" onClick={() => window.location.reload()}>刷新应用</Button>
      </div> : <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-txt-secondary">{isCloudMode ? '云端模式：选中集合将追加创建，不删除已有记录；再次导入可能产生重复。' : '本地模式：只替换选中的集合，未选集合保留；一个事务完成业务集合写入。'}建议恢复前先导出当前备份，并关闭其他正在编辑的标签页。</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy || reading} onClick={chooseFile}><FileUp size={13} />选择 JSON 文件</Button>
          <Button size="sm" variant="outline" disabled={busy || reading} onClick={() => void backupCurrent()}><FileDown size={13} />先导出当前备份</Button>
        </div>
        {reading && <p role="status" className="flex items-center gap-2 text-sm text-txt-muted"><Loader2 size={16} className="animate-spin" />正在校验文件与读取现有数量…</p>}
        {prepared && <>
          <div className="rounded-xl border border-line-2 bg-surface-1 px-3 py-2 text-xs leading-relaxed text-txt-muted">
            <p className="break-all text-txt-secondary">{fileName}</p>
            <p>备份 v{prepared.backup.version} · 导出时间：{prepared.backup.exportedAt || '旧版本未记录'}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-txt-muted"><tr><th className="px-3 py-2 font-medium">恢复集合</th><th className="px-3 py-2 font-medium">当前</th><th className="px-3 py-2 font-medium">文件</th></tr></thead>
              <tbody>{BACKUP_COLLECTIONS.map((key) => {
                const present = prepared.presentCollections.includes(key)
                return <tr key={key} className="border-t border-line-1"><td className="px-3 py-2"><label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={selected.includes(key)} disabled={busy} onChange={(event) => { setSelected((values) => event.target.checked ? [...values, key] : values.filter((value) => value !== key)); setConfirmed(false) }} className="accent-accent" />{BACKUP_LABELS[key]}</label></td><td className="px-3 py-2 font-mono text-txt-muted">{counts[key] ?? '—'}</td><td className={cn('px-3 py-2', !present && 'text-warn')}>{present ? prepared.backup[key].length : isCloudMode ? '旧版未包含' : '未包含；勾选将清空'}</td></tr>
              })}</tbody>
            </table>
          </div>
          {prepared.warnings.length > 0 && <details className="text-xs leading-relaxed text-txt-muted"><summary className="cursor-pointer text-warn">旧备份兼容提示（{prepared.warnings.length}）</summary><ul className="mt-2 list-inside list-disc space-y-1">{prepared.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
          {availableDeviceKeys.length > 0 ? <fieldset disabled={busy} className="rounded-xl border border-line-2 p-3">
            <legend className="px-1 text-xs font-medium text-txt-secondary">本机补充数据 · 可选，默认不恢复</legend>
            <p className="mb-3 text-[11px] leading-relaxed text-txt-muted">以下内容在业务集合写入完成后单独恢复，会覆盖所选本机内容；与数据库不构成跨存储事务。失败会尽力还原旧值，并明确报告结果。登录凭据、PIN、缓存和活动计时不会恢复。</p>
            <div className="grid gap-2 sm:grid-cols-2">{availableDeviceKeys.map((key) => <label key={key} className="flex cursor-pointer items-start gap-2 text-xs text-txt-secondary"><input type="checkbox" className="mt-0.5 accent-accent" checked={deviceKeys.includes(key)} onChange={(event) => { setDeviceKeys((values) => event.target.checked ? [...values, key] : values.filter((value) => value !== key)); setConfirmed(false) }} />{DEVICE_BACKUP_LABELS[key]}</label>)}</div>
          </fieldset> : <p className="text-xs text-txt-muted">此备份未包含本机补充数据；当前专注历史、日志、档案和偏好将保留。</p>}
          {activeFocus && <p role="alert" className="text-xs leading-relaxed text-warn">当前有运行或暂停的专注，请先<Link to="/focus" onClick={close} className="ml-1 underline">前往专注页重置</Link>，再恢复备份。</p>}
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-txt-secondary"><input type="checkbox" checked={confirmed} disabled={busy || activeFocus} className="mt-0.5 accent-accent" onChange={(event) => setConfirmed(event.target.checked)} />我已核对所选内容，理解{isCloudMode ? '云端追加可能重复' : '本地替换会覆盖选中集合'}，并已保存需要保留的当前备份。</label>
          <Button variant="primary" disabled={busy || reading || !confirmed || activeFocus || !selected.length && !deviceKeys.length} onClick={() => void perform()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}{busy ? '正在恢复，请稍候…' : isCloudMode ? '确认追加所选数据' : '确认恢复所选数据'}</Button>
        </>}
        {notice && <p role="status" className="rounded-xl border border-line-2 bg-surface-1 p-3 text-xs leading-relaxed text-txt-secondary">{notice}</p>}
      </div>}
    </Modal>
  </>
}

