import { splashGold } from '@/components/fx/Burst'
import { useState } from 'react'
import { Link } from 'react-router'
import { focusContextHref } from '@/lib/contextLinks'
import { Calendar, Check, CheckCircle2, ListChecks, MoreHorizontal, Pencil, Play, Search, Tag, Timer, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task } from '@/lib/data/types'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useTaskStore } from '@/stores/taskStore'
import { PRIORITY_META, STATUS_META } from './taskMeta'
import { RescheduleDialog } from './RescheduleDialog'

interface TaskListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
}

export function TaskList({ tasks, onEdit }: TaskListProps) {
  const toggleDone = useTaskStore(state => state.toggleDone)
  const toggleSubtask = useTaskStore(state => state.toggleSubtask)
  const softDelete = useTaskStore(state => state.softDelete)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reschedule, setReschedule] = useState<Task[] | null>(null)
  const [notice, setNotice] = useState('')
  const selectedTasks = tasks.filter(task => selected.has(task.id))
  const performAction = async (action: () => Promise<unknown>) => {
    setError('')
    try { await action() }
    catch { setError('操作未保存，请重试。未成功的记录仍保留。') }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl border border-danger/40 p-3 text-xs text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-accent/30 p-3 text-xs text-txt-secondary">{notice}</p>}
      {/* 批量操作条 */}
      {bulkMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2">
          <span className="text-xs text-accent">已选 {selectedTasks.length} 项</span>
          <button type="button" onClick={() => setSelected(selectedTasks.length === tasks.length ? new Set() : new Set(tasks.map(task => task.id)))} disabled={!tasks.length} className="min-h-8 rounded-lg border border-line-2 px-3 text-xs text-txt-primary disabled:opacity-40">{selectedTasks.length === tasks.length && tasks.length ? '取消全选' : '全选当前列表'}</button>
          <button type="button" onClick={() => { setNotice(''); setReschedule(selectedTasks) }} disabled={!selectedTasks.length} className="min-h-8 rounded-lg border border-line-2 px-3 text-xs text-txt-primary hover:border-accent disabled:opacity-40">批量改期</button>
          <button
            onClick={() => void performAction(async () => {
              for (const task of selectedTasks) if (task.status !== 'done') await toggleDone(task.id)
              setSelected(new Set())
            })}
            disabled={selectedTasks.length === 0}
            className="min-h-8 cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            批量完成
          </button>
          <button
            onClick={() => {
              if (!confirm(`删除选中的 ${selectedTasks.length} 项？任务会移入回收站。`)) return
              void performAction(async () => {
                for (const task of selectedTasks) await softDelete(task.id)
                setSelected(new Set())
              })
            }}
            disabled={selectedTasks.length === 0}
            className="min-h-8 cursor-pointer rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger disabled:opacity-40"
          >
            批量删除
          </button>
          <button onClick={() => { setBulkMode(false); setSelected(new Set()) }} className="ml-auto min-h-8 cursor-pointer text-xs text-txt-muted hover:text-txt-secondary">
            退出批量
          </button>
        </div>
      )}

      {!bulkMode && <div><button type="button" onClick={() => setBulkMode(true)} className="cursor-pointer rounded-xl border border-line-2 px-3 py-2 text-xs text-txt-muted hover:border-accent hover:text-accent">批量操作</button></div>}
      {/* 任务行 */}
      {tasks.length === 0 ? (
        <EmptyState icon={Search} title="没有符合条件的任务" hint="换个筛选条件,或新建一个任务" />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const done = task.status === 'done'
            const overdue = Boolean(task.dueDate && isOverdue(task.dueDate) && !done)
            return (
              <div
                key={task.id}
                onClick={() => { if (bulkMode) { setSelected((prev) => { const n = new Set(prev); if (n.has(task.id)) n.delete(task.id); else n.add(task.id); return n }) } else onEdit(task) }}
                className={'glass-card glass-card-hover group relative flex cursor-pointer items-center gap-2 px-3 py-3 focus-within:z-30 sm:gap-3 sm:px-4' + (bulkMode && selected.has(task.id) ? ' border-accent/60 bg-accent-soft/25' : '')}
              >
                {bulkMode && (
                  <button type="button" aria-pressed={selected.has(task.id)} aria-label={`选择任务：${task.title}`} onClick={event => { event.stopPropagation(); setSelected(previous => { const next = new Set(previous); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next }) }} className={'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border focus-visible:outline-2 focus-visible:outline-accent ' + (selected.has(task.id) ? 'neon-gradient-bg border-transparent' : 'border-line-strong')}>
                    {selected.has(task.id) && <Check size={12} className="text-white" />}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!done) {
                      const r = e.currentTarget.getBoundingClientRect()
                      splashGold(r.left + r.width / 2, r.top + r.height / 2)
                    }
                    void performAction(() => toggleDone(task.id))
                  }}
                  className={cn(
                    'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all focus-visible:outline-2 focus-visible:outline-accent',
                    done ? 'neon-gradient-bg border-transparent' : 'border-line-strong hover:border-accent',
                  )}
                  aria-label={done ? '标记为未完成' : '标记为完成'}
                >
                  {done && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm', done && 'text-txt-muted line-through')}>{task.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}优先级</Badge>
                    <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
                    {task.dueDate && <Badge tone={overdue ? 'rose' : 'slate'}><Calendar size={10} />{overdue ? '已逾期 · ' : ''}{formatDate(task.dueDate)}{task.dueTime ? ` ${task.dueTime}` : ''}</Badge>}
                  </div>
                  {task.description && !done && (
                    <p className="mt-0.5 truncate text-xs text-txt-muted">{task.description}</p>
                  )}
                  {(task.tags.length > 0 || task.subtasks.length > 0 || task.focusMinutes > 0) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-[11px] text-accent-2">
                          <Tag size={9} />#{tag}
                        </span>
                      ))}
                      {task.focusMinutes > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-warn">
                          <Timer size={9} />
                          {task.focusMinutes}m
                        </span>
                      )}
                      {task.subtasks.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(expandedId === task.id ? null : task.id)
                          }}
                          className={cn(
                            'inline-flex min-h-8 cursor-pointer items-center gap-1 rounded text-[11px] focus-visible:outline-2 focus-visible:outline-accent',
                            task.subtasks.every((s) => s.done) ? 'text-success' : 'text-accent',
                          )}
                          aria-expanded={expandedId === task.id}
                          aria-label={`${expandedId === task.id ? '收起' : '展开'}子任务：${task.title}`}
                        >
                          <ListChecks size={10} />
                          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                        </button>
                      )}
                    </div>
                  )}
                  {/* 子任务内联清单 */}
                  {expandedId === task.id && task.subtasks.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 border-l-2 border-line-2 pl-3">
                      {task.subtasks.map((s) => (
                        <button
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            void performAction(() => toggleSubtask(task.id, s.id))
                          }}
                          className="flex min-h-8 cursor-pointer items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          <span
                            className={cn(
                              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-all',
                              s.done ? 'neon-gradient-bg border-transparent' : 'border-line-strong',
                            )}
                          >
                            {s.done && <CheckCircle2 size={9} className="text-white" />}
                          </span>
                          <span className={cn('text-xs', s.done ? 'text-txt-muted line-through' : 'text-txt-secondary')}>
                            {s.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!done && !bulkMode && <Link to={focusContextHref(task.id)} onClick={event => event.stopPropagation()} aria-label={`去专注：${task.title}`} title="带着这项任务进入专注，不会自动开始计时" className="flex min-h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-line-2 p-2 text-xs text-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"><Play size={13} /><span className="hidden md:inline">专注</span></Link>}
                {!bulkMode && <button type="button" aria-label={`重新安排：${task.title}`} title="重新安排日期" onClick={event => { event.stopPropagation(); setNotice(''); setReschedule([task]) }} className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-line-2 text-txt-secondary hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"><Calendar size={15} /></button>}
                <details className="relative shrink-0" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}>
                  <summary aria-label={`更多操作：${task.title}`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-txt-secondary hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-accent"><MoreHorizontal size={18} /></summary>
                  <div className="absolute top-full right-0 z-20 mt-1 min-w-36 rounded-xl border border-line-2 bg-ink-900 p-1 shadow-xl">
                    <Button size="sm" className="w-full" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onEdit(task) }}><Pencil size={13} />编辑任务</Button>
                    <Button size="sm" variant="danger" className="w-full" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setDeleteId(task.id) }}><Trash2 size={13} />移入回收站</Button>
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        message="任务会移入回收站,保留 30 天,随时可恢复。现在移入吗?"
        confirmText="移入回收站"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void performAction(() => softDelete(deleteId))
          setDeleteId(null)
        }}
      />
      {reschedule && <RescheduleDialog targets={reschedule} onClose={() => setReschedule(null)} onSaved={ids => { if (ids.length) { setSelected(previous => { const next = new Set(previous); ids.forEach(id => next.delete(id)); return next }); setNotice(`已保存 ${ids.length} 项任务的日期。`) } }} />}
    </div>
  )
}
