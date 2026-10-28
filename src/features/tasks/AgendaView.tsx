import { useRef, useState } from 'react'
import { CalendarDays, Check, CheckCircle2, Circle, Plus, Repeat2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { groupAgendaTasks } from './taskAgenda'
import { PRIORITY_META, RECURRENCE_LABEL, STATUS_META } from './taskMeta'

export function AgendaView({ tasks, today, onEdit, onAddAt }: { tasks: Task[]; today: string; onEdit: (task: Task) => void; onAddAt: (date?: string) => void }) {
  const groups = groupAgendaTasks(tasks)
  const pending = useRef(new Set<string>())
  const [busy, setBusy] = useState<string[]>([])
  const [error, setError] = useState('')
  const toggle = async (task: Task) => {
    if (pending.current.has(task.id)) return
    pending.current.add(task.id)
    setBusy([...pending.current])
    setError('')
    try { await useTaskStore.getState().toggleDone(task.id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '更新失败，原任务已保留，请重试。') }
    finally { pending.current.delete(task.id); setBusy([...pending.current]) }
  }
  if (!groups.length) return <EmptyState icon={CalendarDays} title="当前筛选下没有日程" hint="调整上方筛选，或添加一条带截止日期的任务。"><Button onClick={() => onAddAt(today)}><Plus size={14} />安排今天</Button></EmptyState>
  return <div className="flex min-w-0 flex-col gap-5" aria-label="按日期排列的日程">
    <p className="text-xs leading-relaxed text-txt-secondary">按截止日期从早到晚排列；未排期放在最后。沿用当前筛选，组内保持所选排序。</p>
    {error && <p role="alert" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-txt-primary">{error}</p>}
    {groups.map(group => {
      const outstanding = group.tasks.filter(task => task.status !== 'done').length
      const overdue = Boolean(group.date && group.date < today && outstanding)
      const date = group.date ? new Date(...group.date.split('-').map((value, index) => Number(value) - (index === 1 ? 1 : 0)) as [number, number, number]) : null
      const label = date ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date) : '未排期'
      return <section key={group.date ?? 'inbox'} className="min-w-0 rounded-2xl border border-line-2 bg-surface-1" aria-label={label}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-txt-primary">{label}</h3>{group.date === today && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent">今天</span>}{overdue && <span className="rounded-md bg-rose-400/10 px-2 py-0.5 text-xs text-danger">逾期 {outstanding} 项</span>}<span className="text-xs text-txt-secondary">{group.tasks.length - outstanding}/{group.tasks.length} 已完成</span></div>
          <Button size="sm" variant="ghost" onClick={() => onAddAt(group.date ?? undefined)} aria-label={`在${label}新建任务`}><Plus size={14} />添加</Button>
        </div>
        <div className="divide-y divide-line-1">{group.tasks.map(task => <div key={task.id} className="flex min-w-0 items-start gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <button type="button" disabled={busy.includes(task.id)} aria-label={`${task.status === 'done' ? '取消完成' : '完成任务'}：${task.title}`} aria-pressed={task.status === 'done'} onClick={() => void toggle(task)} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">{task.status === 'done' ? <CheckCircle2 size={20} /> : busy.includes(task.id) ? <Check size={20} /> : <Circle size={20} />}</button>
          <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 cursor-pointer rounded-lg py-1 text-left focus-visible:outline-2 focus-visible:outline-accent"><span className={cn('block break-words text-sm font-medium', task.status === 'done' ? 'text-txt-muted line-through' : 'text-txt-primary')}>{task.title}</span><span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-txt-secondary">{task.dueTime && <span>截止 {task.dueTime}</span>}<span>{STATUS_META[task.status].label}</span><span className={task.priority === 'high' ? 'text-danger' : ''}>{PRIORITY_META[task.priority].label}优先级</span>{task.recurrence !== 'none' && <span className="inline-flex items-center gap-1"><Repeat2 size={11} />{RECURRENCE_LABEL[task.recurrence]}</span>}{task.subtasks.length > 0 && <span>清单 {task.subtasks.filter(item => item.done).length}/{task.subtasks.length}</span>}{task.tags.slice(0, 3).map(tag => <span key={tag} className="max-w-32 truncate">#{tag}</span>)}</span></button>
        </div>)}</div>
      </section>
    })}
  </div>
}
