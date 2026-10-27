import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CalendarDays, CalendarRange, ChevronDown, CopyPlus, LayoutGrid, LayoutTemplate, List, Loader2, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import type { Task, TaskStatus } from '@/lib/data/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/data/types'
import { cn, todayStr } from '@/lib/utils'
import { consumeAction } from '@/lib/uiBus'
import { activeCloudConnection } from '@/lib/config'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { CalendarView } from '@/features/tasks/CalendarView'
import { AgendaView } from '@/features/tasks/AgendaView'
import { KanbanBoard } from '@/features/tasks/KanbanBoard'
import { TaskList } from '@/features/tasks/TaskList'
import { TaskModal } from '@/features/tasks/TaskModal'
import { TemplateModal } from '@/features/tasks/TemplateModal'
import { TaskSavedViews } from '@/features/tasks/TaskSavedViews'
import { savedTaskViewsKey, TASK_VIEW_QUERY_KEYS, type SavedViewOwner } from '@/features/tasks/savedViews'
import { retainTaskEditor } from '@/features/tasks/taskDraft'
import { DEFAULT_FILTERS, TASK_SCOPES, filterTasks, patchTaskFilters, readFilters, readTaskView, resolveTaskTarget, taskScopeCounts, type TaskFilters } from '@/features/tasks/taskFilters'

type ViewMode = 'list' | 'kanban' | 'calendar' | 'agenda'
const VIEW_KEY = 'nexus:task-view'
const VIEWS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: '列表', icon: List },
  { value: 'kanban', label: '看板', icon: LayoutGrid },
  { value: 'calendar', label: '日历', icon: CalendarDays },
  { value: 'agenda', label: '日程', icon: CalendarRange },
]
interface Creation { status: TaskStatus; dueDate?: string; tag: string; ownerKey: string }

export default function TasksPage() {
  const loaded = useTaskStore((state) => state.loaded)
  const tasks = useTaskStore((state) => state.tasks)
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => readFilters(params), [params])
  const ready = useAuthStore(state => state.ready)
  const userId = useAuthStore(state => state.user?.id)
  const viewOwner = useMemo<SavedViewOwner | null>(() => activeCloudConnection
    ? ready && userId ? { mode: 'cloud', url: activeCloudConnection.url, userId } : null
    : { mode: 'local' }, [ready, userId])
  const ownerKey = viewOwner ? savedTaskViewsKey(viewOwner) : null
  const [filtersOpen, setFiltersOpen] = useState(() => filters.status !== 'all' || filters.priority !== 'all' || Boolean(filters.tag) || filters.sort !== 'smart')
  const [savedView, setSavedView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) }
    catch { return null }
  })
  const view = readTaskView(params, savedView)
  const [today, setToday] = useState(todayStr)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [creation, setCreation] = useState<Creation | null>(null)
  const activeCreation = creation?.ownerKey === ownerKey ? creation : null
  const target = resolveTaskTarget(params.get('task'), tasks, loaded)
  const [editorSnapshot, setEditorSnapshot] = useState<{ ownerKey: string | null; task: Task | null }>(() => ({ ownerKey, task: target.kind === 'edit' ? target.task : null }))
  const editing = retainTaskEditor(editorSnapshot.task, params.get('task'), target.kind === 'edit' ? target.task : undefined, { previous: editorSnapshot.ownerKey, current: ownerKey })
  useEffect(() => { setEditorSnapshot({ ownerKey, task: editing }) }, [ownerKey, editing])
  useEffect(() => { setCreation(null) }, [ownerKey])
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
    if (!ownerKey) return
    setCreation({ status, dueDate, tag: filters.tag, ownerKey })
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('task')
      next.delete('create')
      return next
    }, { replace: true })
  }, [filters.tag, setParams, ownerKey])

  // 目标的创建链接只消费一次，避免关闭或刷新后重复弹出。
  const createRequested = params.get('create') === '1'
  useEffect(() => {
    if (!loaded || !createRequested || !ownerKey) return
    if (!params.has('task')) setCreation({ status: 'todo', tag: params.get('tag') ?? '', ownerKey })
    setParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('create')
      return next
    }, { replace: true })
  }, [loaded, createRequested, params, setParams, ownerKey])

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

  const restoreView = (saved: URLSearchParams) => {
    setCreation(null)
    setParams(previous => {
      const next = new URLSearchParams(previous)
      for (const key of [...TASK_VIEW_QUERY_KEYS, 'task', 'create']) next.delete(key)
      saved.forEach((value, key) => next.set(key, value))
      return next
    })
  }

  if (!loaded) return <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary"><Loader2 className="animate-spin" size={20} /><span className="text-sm">加载任务中…</span></div>

  const hasFilters = Object.keys(DEFAULT_FILTERS).some(key => filters[key as keyof TaskFilters] !== DEFAULT_FILTERS[key as keyof TaskFilters])
  const chips: { key: keyof TaskFilters; label: string }[] = []
  if (filters.scope !== 'all') chips.push({ key: 'scope', label: TASK_SCOPES.find(scope => scope.value === filters.scope)!.label })
  if (filters.search) chips.push({ key: 'search', label: `搜索：${filters.search}` })
  if (filters.tag) chips.push({ key: 'tag', label: `#${filters.tag}` })
  if (filters.status !== 'all') chips.push({ key: 'status', label: TASK_STATUSES.find(status => status.value === filters.status)!.label })
  if (filters.priority !== 'all') chips.push({ key: 'priority', label: `${TASK_PRIORITIES.find(priority => priority.value === filters.priority)!.label}优先级` })
  if (filters.sort !== 'smart') chips.push({ key: 'sort', label: { due: '截止日优先', newest: '最新创建', title: '标题排序' }[filters.sort] })
  const advancedCount = chips.filter(chip => !['scope', 'search'].includes(chip.key)).length
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-xl border border-line-2 bg-surface-1 p-1" role="group" aria-label="任务显示方式">
          {VIEWS.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => switchView(value)} aria-pressed={view === value} className={cn('flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-all focus-visible:outline-2 focus-visible:outline-accent sm:gap-1.5 sm:px-3', view === value ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary')}><Icon size={14} />{label}</button>)}
        </div>
        <Button variant="primary" className="shrink-0 px-2 sm:px-3" onClick={() => openCreate()}><Plus size={15} />新建任务</Button>
      </div>

      <div className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-1" role="group" aria-label="任务行动视图">
        {TASK_SCOPES.map(scope => <button key={scope.value} type="button" aria-pressed={filters.scope === scope.value} title={scope.hint} onClick={() => changeFilters({ scope: scope.value }, false)} className={cn('flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent', filters.scope === scope.value ? 'border-accent bg-accent-soft text-accent' : 'border-line-2 bg-surface-1 text-txt-secondary hover:border-accent')}><span>{scope.label}</span><span className="rounded-md bg-surface-3 px-1.5 font-mono tabular-nums">{counts[scope.value]}</span></button>)}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-txt-muted" aria-hidden="true" />
          <Input aria-label="搜索任务标题、描述或标签" value={filters.search} onChange={event => changeFilters({ search: event.target.value })} placeholder="搜索标题、描述或标签…" className="pl-9" />
        </div>
        <Button variant="outline" aria-expanded={filtersOpen} aria-controls="task-advanced-filters" className="shrink-0 px-3" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={15} />筛选{advancedCount > 0 && <span className="rounded bg-accent-soft px-1 text-accent">{advancedCount}</span>}<ChevronDown size={13} className={cn('transition-transform', filtersOpen && 'rotate-180')} /></Button>
      </div>
      {filtersOpen && <div id="task-advanced-filters" className="rounded-xl border border-line-2 bg-surface-1 p-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="text-xs text-txt-secondary">标签<Select aria-label="筛选任务标签" value={filters.tag} onChange={event => changeFilters({ tag: event.target.value })} className="mt-1 w-full"><option value="">全部标签</option>{tags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}</Select></label>
          <label className="text-xs text-txt-secondary">状态<Select aria-label="筛选任务状态" value={filters.status} onChange={event => changeFilters({ status: event.target.value as TaskFilters['status'] })} className="mt-1 w-full"><option value="all">全部状态</option>{TASK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</Select></label>
          <label className="text-xs text-txt-secondary">优先级<Select aria-label="筛选任务优先级" value={filters.priority} onChange={event => changeFilters({ priority: event.target.value as TaskFilters['priority'] })} className="mt-1 w-full"><option value="all">全部优先级</option>{TASK_PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}优先级</option>)}</Select></label>
          <label className="text-xs text-txt-secondary">排序<Select aria-label="任务排序方式" value={filters.sort} disabled={view === 'kanban'} title={view === 'kanban' ? '看板保持手动拖拽顺序' : '任务排序方式'} onChange={event => changeFilters({ sort: event.target.value as TaskFilters['sort'] })} className="mt-1 w-full"><option value="smart">智能排序</option><option value="due">截止日优先</option><option value="newest">最新创建</option><option value="title">标题排序</option></Select></label>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-txt-muted">{view === 'kanban' ? '看板内保持手动拖拽顺序' : '筛选会即时应用'}</span><Button size="sm" variant="ghost" onClick={() => setTemplateOpen(true)}><LayoutTemplate size={14} />从模板新建</Button></div>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-2"><TaskSavedViews key={ownerKey ?? 'waiting'} owner={viewOwner} params={params} view={view} onRestore={restoreView} /><Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('nexus:capture', { detail: 'batch' }))}><CopyPlus size={14} />批量添加</Button></div>
        <span className="whitespace-nowrap text-xs text-txt-secondary" role="status" title={TASK_SCOPES.find(scope => scope.value === filters.scope)?.hint}>当前 {filtered.length} 项</span>
      </div>
      {chips.length > 0 && <div aria-label="当前生效的筛选条件" className="flex flex-wrap gap-1.5">{chips.map(chip => <button key={chip.key} type="button" onClick={() => changeFilters({ [chip.key]: DEFAULT_FILTERS[chip.key] })} aria-label={`移除筛选：${chip.label}`} title={chip.label} className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1 rounded-lg border border-accent/25 bg-accent-soft px-2 text-xs text-accent focus-visible:outline-2 focus-visible:outline-accent"><span className="max-w-48 truncate">{chip.label}</span><X size={12} className="shrink-0" /></button>)}{hasFilters && <Button size="sm" variant="ghost" onClick={() => changeFilters(DEFAULT_FILTERS)}>清除筛选</Button>}</div>}

      {target.kind === 'missing' && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-txt-secondary"><span>这条任务不存在或已移入回收站，请检查链接或到回收站查找。</span><Button size="sm" variant="ghost" onClick={closeTask}>关闭提示</Button></div>}
      {view === 'list' && <TaskList tasks={filtered} onEdit={openEdit} />}
      {view === 'agenda' && <AgendaView key={`agenda:${ownerKey ?? 'waiting'}`} tasks={filtered} today={today} onEdit={openEdit} onAddAt={date => openCreate('todo', date)} />}
      {view === 'kanban' && <div className="h-[calc(100dvh-20rem)] min-h-[420px]"><KanbanBoard tasks={filtered} onEdit={openEdit} onAdd={status => openCreate(status)} /></div>}
      {view === 'calendar' && <div className="h-[calc(100dvh-20rem)] min-h-[480px] overflow-y-auto pr-1"><CalendarView tasks={filtered} onEdit={openEdit} onAddAt={date => openCreate('todo', date)} /></div>}

      <TaskModal key={ownerKey ?? 'waiting'} open={editing !== null || activeCreation !== null} onClose={closeTask} task={editing} unavailable={editing !== null && target.kind === 'missing'} defaultStatus={activeCreation?.status ?? 'todo'} defaultDueDate={activeCreation?.dueDate} defaultTag={activeCreation?.tag} />
      <TemplateModal open={templateOpen} onClose={() => setTemplateOpen(false)} />
    </div>
  )
}
