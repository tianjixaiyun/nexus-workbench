import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Loader2, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Goal } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { useGoalStore } from '@/stores/goalStore'
import { GoalModal } from './GoalModal'
import { GOAL_COLOR_META, goalDeadlineLabel, progressOf } from './goalMeta'

/** 进度环 */
function ProgressRing({ percent, color, size = 84 }: { percent: number; color: string; size?: number }) {
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold tabular-nums">
        {percent}%
      </span>
    </div>
  )
}

export function GoalsView() {
  const { goals, loaded: goalsLoaded, remove } = useGoalStore()
  const allTasks = useTaskStore((s) => s.tasks)
  const tasksLoaded = useTaskStore((s) => s.loaded)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const allTags = useMemo(() => [...new Set(activeTasks(allTasks).flatMap((t) => t.tags))], [allTasks])
  const loaded = goalsLoaded && tasksLoaded

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (goal: Goal) => {
    setEditing(goal)
    setModalOpen(true)
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
        <p className="max-w-lg text-xs leading-relaxed text-txt-muted">
          目标是所有任务的「为什么」:给目标关联一个标签,打了该标签的任务完成率会自动变成目标进度。
        </p>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} />
          新建目标
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="还没有目标" hint="季度要做成的一件事、年度想达成的里程碑,都值得立一个目标">
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} />
            新建目标
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const progress = progressOf(goal, allTasks)
            const dl = goalDeadlineLabel(goal)
            return (
              <Card key={goal.id} className="glass-card-hover group flex items-center gap-4">
                <ProgressRing percent={progress.percent} color={GOAL_COLOR_META[goal.color].stroke} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <span className="mr-1">{goal.emoji}</span>
                    {goal.title}
                  </p>
                  <p className="mt-1 text-xs text-txt-muted">
                    {goal.mode === 'auto'
                      ? `${progress.done}/${progress.total} 个「#${goal.tag}」任务已完成`
                      : `手动进度 ${progress.percent}%`}
                  </p>
                  {goal.mode === 'auto' && goal.tag && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-accent">
                    <Link to={`/tasks?${new URLSearchParams({ tag: goal.tag })}`} aria-label={`查看目标「${goal.title}」的相关任务`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-accent">查看相关任务</Link>
                    <Link to={`/tasks?${new URLSearchParams({ tag: goal.tag, create: '1' })}`} aria-label={`为目标「${goal.title}」添加下一步`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-accent">添加下一步</Link>
                  </div>}
                  {dl && <p className={cn('mt-0.5 text-[11px]', dl.tone)}>{dl.text}</p>}
                </div>
                <div className="hidden shrink-0 flex-col gap-1 group-hover:flex">
                  <button
                    onClick={() => openEdit(goal)}
                    className="cursor-pointer rounded-md p-1.5 text-txt-muted hover:bg-white/8 hover:text-txt-primary"
                    aria-label="编辑"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(goal.id)}
                    className="cursor-pointer rounded-md p-1.5 text-txt-muted hover:bg-rose-500/15 hover:text-rose-300"
                    aria-label="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <GoalModal open={modalOpen} onClose={() => setModalOpen(false)} goal={editing} allTags={allTags} />

      <ConfirmDialog
        open={deleteId !== null}
        message="删除目标不影响任务本身,确定删除吗?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void remove(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
