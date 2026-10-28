import { useRef, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Task } from '@/lib/data/types'
import { cn, formatDate } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { shiftDay } from './taskFilters'
import { mondayOf, weekGroups } from './taskWeek'

export function WeekView({ tasks, today, onEdit, onAddAt, onShowAllDates, scoped }: { tasks: Task[]; today: string; onEdit: (task: Task) => void; onAddAt: (date: string) => void; onShowAllDates: () => void; scoped: boolean }) {
  const [start, setStart] = useState(() => mondayOf(today))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string[]>([])
  const pending = useRef(new Set<string>())
  const groups = weekGroups(tasks, start)
  const undated = tasks.filter(task => !task.deletedAt && !task.dueDate).length
  const toggle = async (task: Task) => {
    if (pending.current.has(task.id)) return
    pending.current.add(task.id); setBusy([...pending.current]); setError('')
    try { await useTaskStore.getState().toggleDone(task.id) }
    catch { setError('任务状态未确认，请检查连接和任务列表后重试。') }
    finally { pending.current.delete(task.id); setBusy([...pending.current]) }
  }
  return <div className="space-y-4" aria-label="周计划">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-txt-primary">{formatDate(start)} — {formatDate(shiftDay(start, 6))}</p><p className="mt-1 text-xs leading-5 text-txt-secondary">按截止日期排列；沿用当前筛选条件。{undated > 0 && ` 当前筛选中 ${undated} 项未排期，不显示在周计划。`}</p></div><div className="flex items-center gap-1"><Button size="icon" variant="outline" aria-label="上一周" onClick={() => setStart(shiftDay(start, -7))}><ChevronLeft size={16} /></Button><Button size="sm" variant="outline" onClick={() => setStart(mondayOf(today))}>回到本周</Button><Button size="icon" variant="outline" aria-label="下一周" onClick={() => setStart(shiftDay(start, 7))}><ChevronRight size={16} /></Button></div></div>
    {scoped && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line-2 bg-surface-1 p-3 text-xs text-txt-secondary">日期范围筛选可能隐藏其他天的任务。<Button size="sm" variant="outline" onClick={onShowAllDates}>显示全部日期</Button></div>}
    {error && <p role="alert" className="rounded-xl border border-danger/40 p-3 text-sm text-danger">{error}</p>}
    <div className="grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-7">{groups.map((group, index) => <section key={group.date} aria-label={`${formatDate(group.date)} 星期${'一二三四五六日'[index]}`} className={cn('min-w-0 rounded-xl border bg-surface-1', group.date === today ? 'border-accent/50' : 'border-line-2')}>
      <div className="flex items-center justify-between gap-1 border-b border-line-2 px-3 py-2"><div className="min-w-0"><p className="text-xs font-semibold text-txt-primary">周{'一二三四五六日'[index]} · {formatDate(group.date)}</p><p className="mt-0.5 text-[11px] text-txt-muted">{group.date === today ? '今天 · ' : ''}{group.tasks.length} 项</p></div><button type="button" aria-label={`在 ${group.date} 新建任务`} onClick={() => onAddAt(group.date)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"><Plus size={16} /></button></div>
      {group.tasks.length ? <ul className="divide-y divide-line-1">{group.tasks.map(task => <li key={task.id} className="flex min-w-0 items-start gap-1 px-2 py-2"><button type="button" disabled={busy.includes(task.id)} onClick={() => void toggle(task)} aria-label={`${task.status === 'done' ? '取消完成' : '完成任务'}：${task.title}`} className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">{task.status === 'done' ? <CheckCircle2 size={17} /> : <Circle size={17} />}</button><button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 rounded-lg py-1.5 text-left focus-visible:outline-2 focus-visible:outline-accent"><span className={cn('block break-words text-xs leading-5', task.status === 'done' && 'text-txt-muted line-through')}>{task.title}</span><span className="mt-1 block text-[11px] text-txt-secondary">{task.dueTime ? `截止 ${task.dueTime}` : '未设具体时间'}</span></button></li>)}</ul> : <p className="flex items-center gap-1 px-3 py-3 text-xs text-txt-muted"><CalendarDays size={12} />暂无任务</p>}
    </section>)}</div>
  </div>
}
