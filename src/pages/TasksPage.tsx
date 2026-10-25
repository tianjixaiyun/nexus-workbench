import { useEffect, useState } from 'react'
import { CalendarDays, LayoutGrid, List, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Task, TaskStatus } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { consumeAction } from '@/lib/uiBus'
import { useTaskStore } from '@/stores/taskStore'
import { CalendarView } from '@/features/tasks/CalendarView'
import { KanbanBoard } from '@/features/tasks/KanbanBoard'
import { TaskList } from '@/features/tasks/TaskList'
import { TaskModal } from '@/features/tasks/TaskModal'

type ViewMode = 'list' | 'kanban' | 'calendar'

const VIEW_KEY = 'nexus:task-view'

const VIEWS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'list', label: '列表', icon: List },
  { value: 'kanban', label: '看板', icon: LayoutGrid },
  { value: 'calendar', label: '日历', icon: CalendarDays },
]

export default function TasksPage() {
  const loaded = useTaskStore((s) => s.loaded)
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'kanban' || saved === 'calendar' ? saved : 'list'
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  /** 看板某列的 + 按钮:新建时预设状态 */
  const [presetStatus, setPresetStatus] = useState<TaskStatus | null>(null)
  /** 日历某天的 + :新建时预设截止日期 */
  const [presetDueDate, setPresetDueDate] = useState<string | undefined>(undefined)

  const openCreate = (status?: TaskStatus, dueDate?: string) => {
    setPresetStatus(status ?? null)
    setPresetDueDate(dueDate)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (task: Task) => {
    setPresetStatus(null)
    setPresetDueDate(undefined)
    setEditing(task)
    setModalOpen(true)
  }

  // 命令面板/快捷键的「新建任务」:页面可能刚挂载,从 uiBus 取待办动作
  useEffect(() => {
    const open = () => openCreate()
    if (consumeAction('new-task')) open()
    window.addEventListener('nexus:action', open)
    return () => window.removeEventListener('nexus:action', open)
  }, [])

  const switchView = (v: ViewMode) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line-2 bg-surface-1 p-1">
          {VIEWS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => switchView(value)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs transition-all',
                view === value ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => openCreate()}>
          <Plus size={15} />
          新建任务
        </Button>
      </div>

      {view === 'list' && <TaskList onEdit={openEdit} />}
      {view === 'kanban' && (
        <div className="h-[calc(100dvh-13rem)] min-h-[420px]">
          <KanbanBoard onEdit={openEdit} onAdd={(status) => openCreate(status)} />
        </div>
      )}
      {view === 'calendar' && (
        <div className="h-[calc(100dvh-13rem)] min-h-[480px] overflow-y-auto pr-1">
          <CalendarView onEdit={openEdit} onAddAt={(date) => openCreate(undefined, date)} />
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editing}
        defaultStatus={presetStatus ?? 'todo'}
        defaultDueDate={presetDueDate}
      />
    </div>
  )
}
