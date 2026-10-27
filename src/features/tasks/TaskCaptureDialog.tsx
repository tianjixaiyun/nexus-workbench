import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, CheckSquare, Loader2, StickyNote } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { useNoteStore } from '@/stores/noteStore'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/toastStore'
import { captureIssue, parseTaskCapture, saveCaptureRows } from './taskCapture'
import { PRIORITY_META, RECURRENCE_LABEL } from './taskMeta'

export function QuickCapture({ open, onClose, initialBatch = false }: { open: boolean; onClose: () => void; initialBatch?: boolean }) {
  const [text, setText] = useState('')
  const [batch, setBatch] = useState(initialBatch)
  const [recognize, setRecognize] = useState(true)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const mounted = useRef(false)
  const inputId = useId()
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!open) return
    setBatch(initialBatch)
    setError('')
    setDiscard(false)
  }, [open, initialBatch])
  const rows = parseTaskCapture(text, batch, recognize)
  const issue = captureIssue(rows)
  const requestClose = () => {
    if (lock.current) return
    if (text.trim()) setDiscard(true)
    else onClose()
  }
  const save = async (note = false) => {
    if (lock.current || (note ? !text.trim() : issue)) return
    const session = useAuthStore.getState()
    const requestOwner = session.user?.id
    if (!session.ready || !requestOwner) { setError('请先完成账号初始化或登录，再保存内容。'); return }
    const isCurrent = () => mounted.current && useAuthStore.getState().ready && useAuthStore.getState().user?.id === requestOwner
    lock.current = true
    setSaving(true)
    setProgress(0)
    setError('')
    try {
      if (note) {
        await useNoteStore.getState().add({ title: text.trim().split('\n')[0].slice(0, 30), content: text.trim(), color: 'cyan' })
        if (!isCurrent()) return
        toast.success('已存为便签', '保留了全部原文。')
      } else {
        const result = await saveCaptureRows(rows, useTaskStore.getState().add, isCurrent, setProgress)
        if (!isCurrent() || result.interrupted) return
        if (result.error) {
          setText(result.remaining.map(row => row.raw).join('\n'))
          setError(`已确认保存 ${result.completed} 条，剩余内容已保留。${result.error}。请先核对任务中心，再决定是否重试，避免网络异常造成重复。`)
          return
        }
        toast.success(`已添加 ${result.completed} 条任务`, '可到任务中心或日程视图查看。')
      }
      setText('')
      onClose()
    } catch (cause) {
      if (isCurrent()) setError(cause instanceof Error ? cause.message : '保存失败，内容已保留，请重试。')
    } finally {
      lock.current = false
      if (mounted.current) setSaving(false)
    }
  }
  return <Modal open={open} onClose={requestClose} title="快速捕捉" className="workspace-panel max-w-2xl">
    <div className="mb-3 flex gap-2" role="group" aria-label="录入方式">{[{ value: false, label: '单条记录' }, { value: true, label: '批量任务' }].map(mode => <button key={mode.label} type="button" aria-pressed={batch === mode.value} disabled={saving} onClick={() => { setBatch(mode.value); setError('') }} className={cn('min-h-9 cursor-pointer rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent', batch === mode.value ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 text-txt-secondary')}>{mode.label}</button>)}</div>
    <label htmlFor={inputId} className="mb-2 block text-sm text-txt-secondary">{batch ? '每行一条任务，可粘贴清单（最多 50 条）' : '第一行是任务标题，其余内容作为描述'}</label>
    <Textarea id={inputId} autoFocus rows={batch ? 6 : 4} maxLength={20_000} disabled={saving} value={text} onChange={event => { setText(event.target.value); setError(''); setDiscard(false) }} placeholder={batch ? '- 明天交方案 #工作 p1\n- 下周五复习 #学习\n- 2026-11-01 整理资料' : '明天交方案 #工作 p1\n记得附上报价单'} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void save() }
    }} />
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-txt-secondary"><label className="flex min-h-8 cursor-pointer items-center gap-2"><input type="checkbox" checked={recognize} disabled={saving} onChange={event => setRecognize(event.target.checked)} className="accent-accent" />识别日期、优先级和重复规则</label><span>{text.length}/20000 字</span></div>
    <p className="text-xs leading-relaxed text-txt-secondary">支持“明天”“下周五”、YYYY-MM-DD、p1/p2/p3 和 #标签。请核对预览；关闭识别可保留日期原文。便签始终保存原文。</p>
    {text.trim() && <section aria-label="即将保存的任务预览" className="mt-3 overflow-hidden rounded-xl border border-line-2 bg-surface-1">
      <div className="flex items-center justify-between border-b border-line-2 px-3 py-2"><h3 className="text-xs font-medium text-txt-secondary">任务预览</h3><span className="text-xs text-txt-secondary">{rows.length} 条</span></div>
      <ol className="max-h-52 divide-y divide-line-1 overflow-y-auto">{rows.slice(0, 50).map((row, index) => <li key={index} className="flex min-w-0 gap-2 px-3 py-2.5"><span className="shrink-0 pt-0.5 font-mono text-xs text-txt-muted">{index + 1}.</span><div className="min-w-0 flex-1"><p className="break-words text-sm text-txt-primary">{row.input.title || '请补充任务标题'}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-txt-secondary"><span className="inline-flex items-center gap-1"><CalendarDays size={12} />{row.input.dueDate || '未排期'}</span><span>{PRIORITY_META[row.input.priority ?? 'medium'].label}优先级</span>{row.input.recurrence && row.input.recurrence !== 'none' && <span>{RECURRENCE_LABEL[row.input.recurrence]}</span>}{row.input.tags?.map(tag => <span key={tag} className="max-w-36 truncate">#{tag}</span>)}</div>{row.input.description && <p className="mt-1 truncate text-xs text-txt-muted" title={row.input.description}>描述：{row.input.description}</p>}</div></li>)}</ol>
    </section>}
    {issue && text.trim() && <p role="status" className="mt-2 text-xs text-warn">{issue}</p>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm leading-relaxed text-txt-primary">{error}</p>}
    {discard ? <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3"><p className="text-sm text-txt-primary">还有未保存内容，确定放弃吗？</p><div className="mt-3 flex justify-end gap-2"><Button onClick={() => setDiscard(false)}>继续编辑</Button><Button variant="danger" onClick={() => { setText(''); setDiscard(false); onClose() }}>放弃并关闭</Button></div></div> : <div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={saving} onClick={requestClose}>取消</Button>{!batch && <Button disabled={saving || !text.trim()} onClick={() => void save(true)}><StickyNote size={14} />存为便签</Button>}<Button variant="primary" disabled={saving || Boolean(issue)} onClick={() => void save()}>{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}{saving ? `保存中 ${progress}/${rows.length}` : batch ? `添加 ${rows.length} 条任务` : '存为任务'}</Button></div>}
    <p className="mt-3 text-right text-xs text-txt-secondary">Ctrl / ⌘ + Enter 存为任务 · Q 唤起</p>
  </Modal>
}
