import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BellRing, X } from 'lucide-react'
import type { Task } from '@/lib/data/types'
import { dueTaskReminders } from './taskReminders'

export function TaskReminderBanner({ tasks }: { tasks: Task[] }) {
  const [now, setNow] = useState(() => new Date())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const due = dueTaskReminders(tasks, now).filter(task => !dismissed.has(`${task.id}:${task.dueDate}:${task.dueTime}`))
  if (!due.length) return null
  const first = due[0]
  return <div role="status" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/30 bg-accent-soft px-4 py-2 text-xs text-txt-primary sm:px-6">
    <BellRing size={15} className="shrink-0 text-accent" aria-hidden="true" />
    <span className="min-w-0 flex-1 break-words">到期提醒 · {first.dueTime} {first.title}{due.length > 1 ? `，另有 ${due.length - 1} 项` : ''}</span>
    <Link to={`/tasks?task=${encodeURIComponent(first.id)}`} className="shrink-0 rounded-md border border-accent/30 px-2 py-1 text-accent hover:bg-accent-soft">查看任务</Link>
    <button type="button" aria-label="关闭本次到期提醒" onClick={() => setDismissed(previous => { const next = new Set(previous); due.forEach(task => next.add(`${task.id}:${task.dueDate}:${task.dueTime}`)); return next })} className="rounded-md p-1 text-txt-secondary hover:text-txt-primary focus-visible:outline-2 focus-visible:outline-accent"><X size={15} /></button>
  </div>
}
