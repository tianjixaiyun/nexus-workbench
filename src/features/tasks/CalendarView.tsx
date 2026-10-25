import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CalendarDays, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import type { Task } from '@/lib/data/types'
import { cn, isOverdue, todayStr } from '@/lib/utils'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { PRIORITY_STRIPE } from './taskMeta'

interface CalendarViewProps {
  onEdit: (task: Task) => void
  onAddAt: (date: string) => void
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 可拖拽的任务片 */
function TaskChip({ task, onEdit, dimmed }: {
  task: Task
  onEdit: (task: Task) => void
  dimmed?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'cal-task' },
  })
  const done = task.status === 'done'
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onEdit(task)
      }}
      className={cn(
        'relative w-full cursor-grab overflow-hidden rounded-md border border-line-2 bg-surface-2 py-1 pl-2 pr-1.5 text-left text-[11px] leading-tight transition-colors hover:border-accent active:cursor-grabbing',
        isDragging && 'opacity-30',
        dimmed && 'opacity-60',
      )}
      title={task.title}
    >
      <span className={cn('absolute top-0 left-0 h-full w-[2.5px]', PRIORITY_STRIPE[task.priority])} />
      <span className={cn('block truncate', done && 'text-txt-muted line-through')}>
        {task.recurrence !== 'none' && <span className="mr-0.5">🔁</span>}
        {task.title}
      </span>
    </button>
  )
}

/** 可放置的一天 */
function DayCell({ dateKey: key, day, tasks, isToday, inMonth, onEdit, onAddAt }: {
  dateKey: string
  day: number
  tasks: Task[]
  isToday: boolean
  inMonth: boolean
  onEdit: (task: Task) => void
  onAddAt: (date: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${key}`, data: { type: 'cal-day', date: key } })
  const visible = tasks.slice(0, 3)
  const extra = tasks.length - visible.length
  const weekend = [0, 6].includes(new Date(key.replace(/-/g, '/')).getDay())

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddAt(key)}
      className={cn(
        'flex min-h-[92px] cursor-pointer flex-col gap-1 border-b border-r border-line-1 p-1.5 transition-colors',
        !inMonth && 'bg-surface-1 text-txt-muted',
        isOver && 'bg-accent-soft',
        isToday && 'bg-accent-soft',
      )}
      title={`点击在 ${key} 新建任务`}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-medium tabular-nums',
            isToday && 'neon-gradient-bg text-white',
            !isToday && weekend && inMonth && 'text-warn',
            !isToday && !weekend && 'text-txt-secondary',
          )}
        >
          {day}
        </span>
        {tasks.length > 3 && <span className="text-[10px] text-txt-muted">{tasks.length} 项</span>}
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((task) => (
          <div key={task.id} onClick={(e) => e.stopPropagation()}>
            <TaskChip
              task={task}
              onEdit={onEdit}
              dimmed={task.status === 'done' || (!inMonth && !isOverdue(task.dueDate))}
            />
          </div>
        ))}
        {extra > 0 && (
          <span className="px-1 text-[10px] text-txt-muted">还有 {extra} 项…</span>
        )}
      </div>
    </div>
  )
}

export function CalendarView({ onEdit, onAddAt }: CalendarViewProps) {
  const allTasks = useTaskStore((s) => s.tasks)
  const update = useTaskStore((s) => s.update)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const [view, setView] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const today = todayStr()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const { year, month } = view
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { key: string; day: number; inMonth: boolean }[] = []
  // 上月补位
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    cells.push({ key: dateKey(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: dateKey(year, month, d), day: d, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = new Date(year, month + 1, cells.length - firstWeekday - daysInMonth + 1)
    cells.push({ key: dateKey(last.getFullYear(), last.getMonth(), last.getDate()), day: last.getDate(), inMonth: false })
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!t.dueDate) continue
      const list = map.get(t.dueDate) ?? []
      list.push(t)
      map.set(t.dueDate, list)
    }
    return map
  }, [tasks])

  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks])

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const overData = over.data.current as { type?: string; date?: string } | undefined
    if (overData?.type !== 'cal-day') return
    const nextDate = overData.date || null // 空字符串 = 拖回未排期区
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.dueDate === nextDate) return
    void update(task.id, { dueDate: nextDate })
  }

  // 未排期区也是放置目标
  function UnscheduledPanel() {
    const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled', data: { type: 'cal-day', date: '' } })
    return (
      <div
        ref={setNodeRef}
        className={cn(
          'flex w-64 shrink-0 flex-col rounded-2xl border border-line-1 bg-surface-1',
          isOver && 'border-accent bg-accent-soft',
        )}
      >
        <div className="flex items-center gap-2 border-b border-line-1 px-4 py-3">
          <Inbox size={15} className="text-txt-muted" />
          <span className="text-sm font-medium">未排期</span>
          <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-txt-muted">{unscheduled.length}</span>
        </div>
        <p className="px-4 pt-2 text-[11px] leading-relaxed text-txt-muted">把任务拖到日历上排期,或拖回这里取消日期</p>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
          {unscheduled.map((task) => (
            <TaskChip key={task.id} task={task} onEdit={onEdit} />
          ))}
          {unscheduled.length === 0 && (
            <p className="py-8 text-center text-xs text-txt-muted">所有任务都有日期了</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        <div className="glass-card min-w-0 flex-1 overflow-hidden">
          {/* 月历头部 */}
          <div className="flex items-center justify-between border-b border-line-1 px-4 py-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => shift(-1)}
                className="cursor-pointer rounded-lg p-1.5 text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-secondary"
                aria-label="上个月"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  const d = new Date()
                  setView({ year: d.getFullYear(), month: d.getMonth() })
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold tracking-wide hover:bg-surface-3"
              >
                {year} 年 {month + 1} 月
              </button>
              <button
                onClick={() => shift(1)}
                className="cursor-pointer rounded-lg p-1.5 text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-secondary"
                aria-label="下个月"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-txt-muted">
              <CalendarDays size={13} />
              拖动任务片改期,点空白处新建
            </div>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 border-b border-line-1">
            {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((w) => (
              <div key={w} className="py-2 text-center text-[11px] tracking-wider text-txt-muted">
                {w}
              </div>
            ))}
          </div>

          {/* 日格 */}
          <div className="grid grid-cols-7">
            {cells.map((cell) => (
              <DayCell
                key={cell.key}
                dateKey={cell.key}
                day={cell.day}
                tasks={byDate.get(cell.key) ?? []}
                isToday={cell.key === today}
                inMonth={cell.inMonth}
                onEdit={onEdit}
                onAddAt={onAddAt}
              />
            ))}
          </div>
        </div>

        <UnscheduledPanel />
      </div>
    </DndContext>
  )
}
