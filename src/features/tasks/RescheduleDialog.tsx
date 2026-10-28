import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Task } from '@/lib/data/types'
import { formatDate, todayStr } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { shiftDay } from './taskFilters'
import { nextMonday, rescheduleSequentially } from './taskReschedule'

export function RescheduleDialog({ targets, onClose, onSaved }: { targets: Task[]; onClose: () => void; onSaved: (ids: string[]) => void }) {
  const [remaining, setRemaining] = useState(targets)
  const [date, setDate] = useState(targets.length === 1 ? targets[0].dueDate ?? '' : '')
  const [clearDate, setClearDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const today = todayStr()
  const save = async () => {
    if (lock.current || (!date && !clearDate)) return
    lock.current = true
    setSaving(true)
    setError('')
    const result = await rescheduleSequentially(remaining.map(task => task.id), async id => {
      const baseline = remaining.find(task => task.id === id)
      const current = useTaskStore.getState().tasks.find(task => task.id === id)
      if (!baseline || !current || current.deletedAt || current.updatedAt !== baseline.updatedAt) throw new Error('任务已变化')
      await useTaskStore.getState().update(id, { dueDate: clearDate ? null : date })
    })
    onSaved(result.completed)
    lock.current = false
    setSaving(false)
    if (!result.remaining.length) { onClose(); return }
    setRemaining(previous => previous.filter(task => result.remaining.includes(task.id)))
    setError(`已保存 ${result.completed.length} 项；${result.remaining.length} 项未保存。可能是连接中断或任务已变更，请关闭后检查并重试。`)
  }
  return <Modal open onClose={() => { if (!lock.current) onClose() }} title={targets.length === 1 ? '重新安排任务' : '批量重新安排'}>
    <div className="space-y-4">
      <p className="text-sm text-txt-secondary">{targets.length === 1 ? `任务：${targets[0].title}` : `将修改 ${remaining.length} 项任务的截止日期。`} 其他内容和重复规则保持不变。</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="快捷选择日期">
        {[['今天', today], ['明天', shiftDay(today, 1)], ['下周一', nextMonday(today)]].map(([label, value]) => <button key={label} type="button" disabled={saving} aria-pressed={!clearDate && date === value} onClick={() => { setDate(value); setClearDate(false) }} className="min-h-10 rounded-lg border border-line-2 px-3 text-sm text-txt-primary hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft disabled:opacity-50">{label} · {formatDate(value)}</button>)}
        <button type="button" disabled={saving} aria-pressed={clearDate} onClick={() => { setDate(''); setClearDate(true) }} className="min-h-10 rounded-lg border border-line-2 px-3 text-sm text-txt-primary hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft disabled:opacity-50">清除日期</button>
      </div>
      <label className="block text-sm text-txt-secondary">自选日期<input type="date" value={date} disabled={saving} onChange={event => { setDate(event.target.value); setClearDate(false) }} className="mt-2 block min-h-11 w-full rounded-lg border border-line-2 bg-surface-1 px-3 text-txt-primary focus-visible:outline-2 focus-visible:outline-accent" /></label>
      {error && <p role="alert" className="rounded-lg border border-danger/40 p-3 text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="ghost" disabled={saving} onClick={onClose}>取消</Button><Button disabled={saving || (!date && !clearDate)} onClick={() => void save()}>{saving ? '正在保存…' : clearDate ? '确认清除日期' : '确认改期'}</Button></div>
    </div>
  </Modal>
}
