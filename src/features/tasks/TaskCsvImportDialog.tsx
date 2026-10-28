import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { parseTaskCsv } from './taskCsvImport'
import { saveCaptureRows, type CaptureRow } from './taskCapture'

export function TaskCsvImportDialog({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<CaptureRow[]>([])
  const [filename, setFilename] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(0)
  const [busy, setBusy] = useState(false)
  const [ack, setAck] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(true)
  const readSequence = useRef(0)
  const tasks = useTaskStore(state => state.tasks)
  const owner = useAuthStore(state => state.user?.id)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; readSequence.current++ } }, [])
  useEffect(() => { setRows([]); setFilename(''); setError(''); setSaved(0); setAck(false); setBusy(false); readSequence.current++ }, [owner])
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || lock.current) return
    const sequence = ++readSequence.current
    setRows([]); setSaved(0); setAck(false); setError(''); setFilename(file.name)
    try {
      if (file.size > 1024 * 1024) throw new Error('文件超过 1 MB，请拆分后再导入。')
      const parsed = parseTaskCsv(await file.text())
      if (mounted.current && sequence === readSequence.current) setRows(parsed)
    } catch (cause) { if (mounted.current && sequence === readSequence.current) setError(cause instanceof Error ? cause.message : '读取失败，请检查文件。') }
  }
  const duplicate = (row: CaptureRow) => tasks.some(task => !task.deletedAt && task.title === row.input.title && task.dueDate === (row.input.dueDate ?? null)) || rows.some(other => other.line !== row.line && other.input.title === row.input.title && other.input.dueDate === row.input.dueDate)
  const save = async () => {
    const requestOwner = useAuthStore.getState().user?.id
    if (lock.current || !ack || !rows.length || !requestOwner) return
    const current = () => mounted.current && useAuthStore.getState().ready && useAuthStore.getState().user?.id === requestOwner
    lock.current = true; setBusy(true); setError(''); setAck(false)
    const result = await saveCaptureRows(rows, input => useTaskStore.getState().add(input), current, () => setSaved(value => value + 1))
    lock.current = false
    if (!current()) return
    setBusy(false)
    setRows(result.remaining)
    if (result.remaining.length) setError(`已确认新增 ${result.completed} 项，还有 ${result.remaining.length} 项未确认。请先检查列表，网络异常时最后一项可能已经写入，避免重复；云端时间字段需先执行更新 SQL。`)
  }
  return <Modal open onClose={() => { if (!lock.current) onClose() }} title="导入任务 CSV">
    <div className="space-y-4">
      <p className="text-sm leading-6 text-txt-secondary">支持 NEXUS 导出的 CSV 或包含“标题”列的 CSV，每次最多 50 项。导入会新增任务，不覆盖现有记录；完整恢复请使用 JSON 备份。</p>
      <label className="block text-sm text-txt-primary">选择 CSV 文件<input type="file" accept=".csv,text/csv" disabled={busy} onChange={event => void choose(event)} className="mt-2 block w-full text-xs text-txt-secondary file:mr-3 file:rounded-lg file:border file:border-line-2 file:bg-surface-1 file:px-3 file:py-2 file:text-txt-primary" /></label>
      {filename && <p className="break-all text-xs text-txt-muted">{filename}</p>}
      {error && <p role="alert" className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm text-txt-primary">{error}</p>}
      {rows.length > 0 && <><div className="rounded-xl border border-line-2 bg-surface-1 p-3"><p className="text-sm text-txt-primary">待新增 {rows.length} 项{saved ? ` · 已保存 ${saved} 项` : ''}</p><ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">{rows.map(row => <li key={row.line} className="break-words text-xs text-txt-secondary">第 {row.line - 1} 项 · {row.input.title}{row.input.dueDate ? ` · ${row.input.dueDate}${row.input.dueTime ? ` ${row.input.dueTime}` : ''}` : ''}{duplicate(row) && <span className="text-warn"> · 可能已存在</span>}</li>)}</ul></div><label className="flex items-start gap-2 text-xs leading-5 text-txt-secondary"><input type="checkbox" checked={ack} disabled={busy} onChange={event => setAck(event.target.checked)} className="mt-1" />我已核对任务与可能重复项，确认新增。</label></>}
      {!rows.length && saved > 0 && !error && <p role="status" className="text-sm text-success">已新增 {saved} 项任务。</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>关闭</Button><Button variant="primary" disabled={busy || !ack || !rows.length} onClick={() => void save()}>{busy ? `保存中 · 已保存 ${saved} 项` : `确认新增 ${rows.length} 项`}</Button></div>
    </div>
  </Modal>
}
