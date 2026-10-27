import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarDays, LayoutGrid, LayoutTemplate, List, Loader2, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import type { Task, TaskStatus } from '@/lib/data/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/data/types'
import { cn, todayStr } from '@/lib/utils'
import { consumeAction } from '@/lib/uiBus'
import { useTaskStore } from '@/stores/taskStore'
import { CalendarView } from '@/features/tasks/CalendarView'
import { KanbanBoard } from '@/features/tasks/KanbanBoard'
import { TaskList } from '@/features/tasks/TaskList'
import { TaskModal } from '@/features/tasks/TaskModal'
import { TemplateModal } from '@/features/tasks/TemplateModal'
import { DEFAULT_FILTERS, TASK_SCOPES, filterTasks, patchTaskFilters, readFilters, readTaskView, resolveTaskTarget, taskScopeCounts, type TaskFilters } from '@/features/tasks/taskFilters'

type ViewMode = 'list' | 'kanban' | 'calendar'
const VIEW_KEY = 'nexus:task-view'
const VIEWS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: '列表', icon: List },
  { value: 'kanban', label: '看板', icon: LayoutGrid },
  { value: 'calendar', label: '日历', icon: CalendarDays },
]
interface Creation { status: TaskStatus; dueDate?: string; tag: string }

export default function TasksPage() {
  const loaded = useTaskStore((state) => state.loaded)
  const tasks = useTaskStore((state) => state.tasks)
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => readFilters(params), [params])
  const [savedView, setSavedView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) }
    catch { return null }
  })
  const view = readTaskView(params, savedView)
  const [today, setToday] = useState(todayStr)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [creation, setCreation] = useState<Creation | null>(null)
  const target = resolveTaskTarget(params.get('task'), tasks, loaded)
  const editing = target.kind === 'edit' ? target.task : null
  const filtered = useMemo(() => filterTasks(tasks, filters, today), [tasks, filters, today])
  const counts = useMemo(() => taskScopeCounts(filterTasks(tasks, { ...filters, scope: 'all' }, today), today), [tasks, filters, today])
  const tags = useMemo(() => [...new Set([filters.tag, ...tasks.filter(task => !task.deletedAt).flatMap(task => task.tags ?? [])])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN')), [tasks, filters.tag])

  useEffect(() => {
    const refresh = () => setToday(todayStr())
    const interval = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  const openCreate = useCallback((status: TaskStatus = 'todo', dueDate?: string) => {
    setCreation({ status, dueDate, tag: filters.tag })
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('task')
      next.delete('create')
      return next
    }, { replace: true })
  }, [filters.tag, setParams])

  // 目标的创建链接只消费一次，避免关闭或刷新后重复弹出。
  const createRequested = params.get('create') === '1'
  useEffect(() => {
    if (!loaded || !createRequested) return
    if (!params.has('task')) setCreation({ status: 'todo', tag: params.get('tag') ?? '' })
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('create')
      return next
    }, { replace: true })
  }, [loaded, createRequested, params, setParams])

  useEffect(() => {
    if (consumeAction('new-task')) openCreate()
    const onAction = (event: Event) => {
      if ((event as CustomEvent).detail !== 'new-task') return
      consumeAction('new-task')
      openCreate()
    }
    window.addEventListener('nexus:action', onAction)
    return () => window.removeEventListener('nexus:action', onAction)
  }, [openCreate])

  const openEdit = (task: Task) => {
    setCreation(null)
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('create')
      next.set('task', task.id)
      return next
    })
  }
  const closeTask = () => {
    setCreation(null)
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('task')
      return next
    }, { replace: true })
  }
  const changeFilters = (patch: Partial<TaskFilters>, replace = true) => {
    setParams(previous => {
      const next = patchTaskFilters(previous, patch)
      next.set('view', view)
      return next
    }, { replace })
  }
  const switchView = (nextView: ViewMode) => {
    setSavedView(nextView)
    try { localStorage.setItem(VIEW_KEY, nextView) } catch { /* 存储受限时仍可在本次使用中切换。 */ }
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('view', nextView)
      return next
    })
  }

  if (!loaded) return <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary"><Loader2 className="animate-spin" size={20} /><span className="text-sm">加载任务中…</span></div>

  const hasFilters = Object.keys(DEFAULT_FILTERS).some(key => filters[key as keyof TaskFilters] !== DEFAULT_FILTERS[key as keyof TaskFilters])
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line-2 bg-surface-1 p-1" role="group" aria-label="任务显示方式">
          {VIEWS.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => switchView(value)} aria-pressed={view === value} className={cn('flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all focus-visible:outline-2 focus-visible:outline-accent', view === value ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary')}><Icon size={14} />{label}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}><LayoutTemplate size={15} />模板</Button>
          <Button variant="primary" onClick={() => openCreate()}><Plus size={15} />新建任务</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="任务行动视图">
        {TASK_SCOPES.map(scope => <button key={scope.value} type="button" aria-pressed={filters.scope === scope.value} title={scope.hint} onClick={() => changeFilters({ scope: scope.value }, false)} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent', filters.scope === scope.value ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-surface-1 text-txt-secondary hover:border-accent')}><span>{scope.label}</span><span className="rounded-md bg-surface-3 px-1.5 font-mono tabular-nums">{counts[scope.value]}</span></button>)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-txt-muted" aria-hidden="true" />
          <Input aria-label="搜索任务标题、描述或标签" value={filters.search} onChange={event => changeFilters({ search: event.target.value })} placeholder="搜索标题、描述或标签…" className="pl-9" />
        </div>
        <Select aria-label="筛选任务标签" value={filters.tag} onChange={event => changeFilters({ tag: event.target.value })} className="w-32"><option value="">全部标签</option>{tags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}</Select>
        <Select aria-label="筛选任务状态" value={filters.status} onChange={event => changeFilters({ status: event.target.value as TaskFilters['status'] })} className="w-28"><option value="all">全部状态</option>{TASK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</Select>
        <Select aria-label="筛选任务优先级" value={filters.priority} onChange={event => changeFilters({ priority: event.target.value as TaskFilters['priority'] })} className="w-28"><option value="all">全部优先级</option>{TASK_PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}优先级</option>)}</Select>
        <Select aria-label="任务排序方式" value={filters.sort} disabled={view === 'kanban'} title={view === 'kanban' ? '看板保持手动拖拽顺序' : '任务排序方式'} onChange={event => changeFilters({ sort: event.target.value as TaskFilters['sort'] })} className="w-32"><option value="smart">智能排序</option><option value="due">截止日优先</option><option value="newest">最新创建</option><option value="title">标题排序</option></Select>
        {hasFilters && <Button size="sm" variant="ghost" onClick={() => changeFilters(DEFAULT_FILTERS)}><X size={13} />重置筛选</Button>}
      </div>
      <p className="text-xs text-txt-muted" role="status">{TASK_SCOPES.find(scope => scope.value === filters.scope)?.hint} · 当前 {filtered.length} 项。数量跟随筛选条件{view === 'kanban' ? '，看板内保持手动拖拽顺序' : ''}。</p>

      {target.kind === 'missing' && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-txt-secondary"><span>这条任务不存在或已移入回收站，请检查链接或到回收站查找。</span><Button size="sm" variant="ghost" onClick={closeTask}>关闭提示</Button></div>}
      {view === 'list' && <TaskList tasks={filtered} onEdit={openEdit} />}
      {view === 'kanban' && <div className="h-[calc(100dvh-20rem)] min-h-[420px]"><KanbanBoard tasks={filtered} onEdit={openEdit} onAdd={status => openCreate(status)} /></div>}
      {view === 'calendar' && <div className="h-[calc(100dvh-20rem)] min-h-[480px] overflow-y-auto pr-1"><CalendarView tasks={filtered} onEdit={openEdit} onAddAt={date => openCreate('todo', date)} /></div>}

      <TaskModal open={editing !== null || creation !== null} onClose={closeTask} task={editing} defaultStatus={creation?.status ?? 'todo'} defaultDueDate={creation?.dueDate} defaultTag={creation?.tag} />
      <TemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} />
    </div>
  )
}
