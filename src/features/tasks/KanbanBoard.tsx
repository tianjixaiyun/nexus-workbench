import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, CheckCircle2, ListChecks, Pencil, Plus, Tag, Timer, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Task, TaskStatus } from '@/lib/data/types'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { ALL_STATUSES, PRIORITY_META, PRIORITY_STRIPE, STATUS_META } from './taskMeta'

interface KanbanProps {
  onEdit: (task: Task) => void
  onAdd: (status: TaskStatus) => void
}

function TaskCardView({ task, onEdit, onDelete, draggable }: {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  draggable?: boolean
}) {
  const done = task.status === 'done'
  const subDone = task.subtasks.filter((s) => s.done).length
  return (
    <div
      className={cn(
        'glass-card glass-card-hover group relative overflow-hidden py-3 pr-3 pl-4',
        draggable && 'cursor-grab active:cursor-grabbing',
        done && 'opacity-70',
      )}
    >
      <span className={cn('absolute top-0 left-0 h-full w-[3px]', PRIORITY_STRIPE[task.priority])} />
      <p className={cn('text-sm leading-snug break-all', done && 'text-txt-muted line-through')}>{task.title}</p>
      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-txt-muted">{task.description}</p>
      )}
      {(task.tags.length > 0 || task.subtasks.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-[11px] text-accent-2">
              <Tag size={9} />#{tag}
            </span>
          ))}
          {task.subtasks.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px]',
                subDone === task.subtasks.length ? 'text-success' : 'text-accent',
              )}
            >
              <ListChecks size={10} />
              {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.focusMinutes > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-warn">
              <Timer size={9} />
              {task.focusMinutes}m
            </span>
          )}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
          {task.dueDate && (
            <Badge tone={isOverdue(task.dueDate) && !done ? 'rose' : 'slate'}>
              <Calendar size={10} />
              {formatDate(task.dueDate)}
            </Badge>
          )}
          {task.subtasks.length > 0 && subDone === task.subtasks.length && !done && (
            <Badge tone="emerald">
              <CheckCircle2 size={10} />
              清单完成
            </Badge>
          )}
        </div>
        {onEdit && onDelete && (
          <div className="hidden shrink-0 gap-1 group-hover:flex">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(task)
              }}
              className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-surface-3 hover:text-txt-primary"
              aria-label="编辑"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task)
              }}
              className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-rose-500/15 hover:text-danger"
              aria-label="删除"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableTaskCard({ task, onEdit, onDelete }: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'opacity-35')}
      {...attributes}
      {...listeners}
    >
      <TaskCardView task={task} onEdit={onEdit} onDelete={onDelete} draggable />
    </div>
  )
}

function KanbanColumn({ status, tasks, onEdit, onAdd, onDelete }: {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onAdd: (status: TaskStatus) => void
  onDelete: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column', status } })
  const meta = STATUS_META[status]
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-line-1 bg-surface-1">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
          <span className="text-sm font-medium">{meta.label}</span>
          <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-txt-muted">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAdd(status)}
          className="cursor-pointer rounded-lg p-1 text-txt-muted transition-colors hover:bg-surface-3 hover:text-accent"
          aria-label={`在「${meta.label}」新建任务`}
        >
          <Plus size={15} />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-b-2xl p-2 transition-colors',
          isOver && 'bg-accent-soft',
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-txt-muted">拖卡片到这里,或点 + 新建</p>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ onEdit, onAdd }: KanbanProps) {
  const allTasks = useTaskStore((s) => s.tasks)
  const move = useTaskStore((s) => s.move)
  const softDelete = useTaskStore((s) => s.softDelete)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] }
    for (const t of [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)) {
      map[t.status].push(t)
    }
    return map
  }, [tasks])

  const draggingTask = draggingId ? tasks.find((t) => t.id === draggingId) ?? null : null

  const handleDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null)
    const { active, over } = e
    if (!over) return
    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    const overData = over.data.current as { type?: string; status?: TaskStatus; sortable?: { index?: number } } | undefined
    let targetStatus: TaskStatus
    if (overData?.type === 'task' && overData.status) {
      targetStatus = overData.status
    } else if (overData?.type === 'column' && overData.status) {
      targetStatus = overData.status
    } else if (ALL_STATUSES.includes(over.id as TaskStatus)) {
      targetStatus = over.id as TaskStatus
    } else {
      return
    }

    const targetIndex =
      overData?.type === 'task' && typeof overData.sortable?.index === 'number'
        ? overData.sortable.index
        : columns[targetStatus].filter((t) => t.id !== activeTask.id).length

    move(String(active.id), targetStatus, targetIndex)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-3">
          {ALL_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columns[status]}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={(t) => setDeleteId(t.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {draggingTask && (
            <div className="rotate-2 opacity-90">
              <TaskCardView task={draggingTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
    </>
  )
}
