import { splashGold } from '@/components/fx/Burst'
import { useMemo, useState } from 'react'
import { Calendar, Check, CheckCircle2, ListChecks, Pencil, Search, Tag, Timer, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Input'
import type { Task, TaskPriority, TaskStatus } from '@/lib/data/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/data/types'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META } from './taskMeta'

interface TaskListProps {
  onEdit: (task: Task) => void
}

export function TaskList({ onEdit }: TaskListProps) {
  const allTasks = useTaskStore((s) => s.tasks)
  const toggleDone = useTaskStore((s) => s.toggleDone)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleSubtask = useTaskStore((s) => s.toggleSubtask)
  const softDelete = useTaskStore((s) => s.softDelete)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return tasks
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
        if (kw && !`${t.title} ${t.description}`.toLowerCase().includes(kw)) return false
        return true
      })
      .sort((a, b) => {
        const doneDiff = Number(a.status === 'done') - Number(b.status === 'done')
        if (doneDiff !== 0) return doneDiff
        const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pDiff !== 0) return pDiff
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  }, [tasks, search, statusFilter, priorityFilter])

  return (
    <div className="flex flex-col gap-4">
      {/* 批量操作条 */}
      {bulkMode && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2">
          <span className="text-xs text-accent">已选 {selected.size} 项</span>
          <button
            onClick={() => {
              for (const id of selected) { const t = tasks.find((x) => x.id === id); if (t && t.status !== 'done') void toggleDone(id) }
              setSelected(new Set())
            }}
            disabled={selected.size === 0}
            className="cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs text-white disabled:opacity-40"
          >
            批量完成
          </button>
          <button
            onClick={async () => {
              if (!confirm(`删除选中的 ${selected.size} 项?(移入回收站)`)) return
              for (const id of selected) await softDelete(id)
              setSelected(new Set())
            }}
            disabled={selected.size === 0}
            className="cursor-pointer rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger disabled:opacity-40"
          >
            批量删除
          </button>
          <button onClick={() => { setBulkMode(false); setSelected(new Set()) }} className="ml-auto cursor-pointer text-xs text-txt-muted hover:text-txt-secondary">
            退出批量
          </button>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2">
        {!bulkMode && (
          <button onClick={() => setBulkMode(true)} className="cursor-pointer rounded-xl border border-line-2 px-3 py-2 text-xs text-txt-muted transition-colors hover:border-accent hover:text-accent">
            批量
          </button>
        )}
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-txt-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索任务…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TaskStatus)}
          className="w-28"
        >
          <option value="all">全部状态</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | TaskPriority)}
          className="w-28"
        >
          <option value="all">全部优先级</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}优先级
            </option>
          ))}
        </Select>
      </div>

      {/* 任务行 */}
      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="没有符合条件的任务" hint="换个筛选条件,或新建一个任务" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => {
            const done = task.status === 'done'
            return (
              <div
                key={task.id}
                onClick={() => { if (bulkMode) { setSelected((prev) => { const n = new Set(prev); if (n.has(task.id)) n.delete(task.id); else n.add(task.id); return n }) } else onEdit(task) }}
                className={'glass-card glass-card-hover group flex cursor-pointer items-center gap-3 px-4 py-3' + (bulkMode && selected.has(task.id) ? ' border-accent/60 bg-accent-soft/25' : '')}
              >
                {bulkMode && (
                  <span className={'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ' + (selected.has(task.id) ? 'neon-gradient-bg border-transparent' : 'border-line-strong')}>
                    {selected.has(task.id) && <Check size={12} className="text-white" />}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!done) {
                      const r = e.currentTarget.getBoundingClientRect()
                      splashGold(r.left + r.width / 2, r.top + r.height / 2)
                    }
                    void toggleDone(task.id)
                  }}
                  className={cn(
                    'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all',
                    done ? 'neon-gradient-bg border-transparent' : 'border-line-strong hover:border-accent',
                  )}
                  aria-label={done ? '标记为未完成' : '标记为完成'}
                >
                  {done && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm', done && 'text-txt-muted line-through')}>{task.title}</p>
                  {task.description && !done && (
                    <p className="mt-0.5 truncate text-xs text-txt-muted">{task.description}</p>
                  )}
                  {(task.tags.length > 0 || task.subtasks.length > 0) && (
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
                            'inline-flex cursor-pointer items-center gap-1 text-[11px]',
                            task.subtasks.every((s) => s.done) ? 'text-success' : 'text-accent',
                          )}
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
                            void toggleSubtask(task.id, s.id)
                          }}
                          className="flex cursor-pointer items-center gap-2 text-left"
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

                <div className="hidden items-center gap-1.5 sm:flex">
                  <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
                  {task.status !== 'done' && (
                    <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
                  )}
                  {task.dueDate && (
                    <Badge tone={isOverdue(task.dueDate) && !done ? 'rose' : 'slate'}>
                      <Calendar size={10} />
                      {formatDate(task.dueDate)}
                    </Badge>
                  )}
                </div>

                <div className="hidden shrink-0 gap-1 group-hover:flex">
                  <Button
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(task)
                    }}
                    aria-label="编辑"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    size="icon"
                    variant="danger"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(task.id)
                    }}
                    aria-label="删除"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
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
          if (deleteId) void softDelete(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
