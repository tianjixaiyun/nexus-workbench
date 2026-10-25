import { useMemo } from 'react'
import { Link } from 'react-router'
import { Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { GOAL_COLOR_META, goalDeadlineLabel, progressOf } from '@/features/goals/goalMeta'
import { useGoalStore } from '@/stores/goalStore'
import { useTaskStore } from '@/stores/taskStore'
import { cn } from '@/lib/utils'

/** 仪表盘:目标进展速览(auto 模式实时联动任务完成情况) */
export function GoalsCard() {
  const { goals, loaded } = useGoalStore()
  const allTasks = useTaskStore((s) => s.tasks)
  const tasksLoaded = useTaskStore((s) => s.loaded)
  const ready = loaded && tasksLoaded

  const withProgress = useMemo(
    () => goals.map((g) => ({ goal: g, progress: progressOf(g, allTasks) })),
    [goals, allTasks],
  )

  // 没有目标时不占版面
  if (!ready || goals.length === 0) return null

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-txt-secondary">
          <Target size={15} className="text-accent" />
          目标进展
        </p>
        <Link to="/goals" className="text-xs text-accent hover:opacity-80">
          管理 →
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {withProgress.slice(0, 3).map(({ goal, progress }) => {
          const dl = goalDeadlineLabel(goal)
          return (
            <div key={goal.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">
                  <span className="mr-1">{goal.emoji}</span>
                  {goal.title}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {dl && <span className={cn('text-[11px]', dl.tone)}>{dl.text}</span>}
                  <span className="font-mono font-bold tabular-nums text-txt-secondary">
                    {goal.mode === 'auto' ? `${progress.done}/${progress.total}` : `${progress.percent}%`}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress.percent}%`, background: GOAL_COLOR_META[goal.color].stroke }}
                />
              </div>
            </div>
          )
        })}
        {goals.length > 3 && (
          <p className="text-[11px] text-txt-muted">还有 {goals.length - 3} 个目标 →</p>
        )}
      </div>
    </Card>
  )
}
