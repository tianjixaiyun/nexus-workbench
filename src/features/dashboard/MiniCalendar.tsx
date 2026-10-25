import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { activeTasks, useTaskStore } from '@/stores/taskStore'
import { todayStr } from '@/lib/utils'

/** 仪表盘迷你月历:标出有任务截止的日子 */
export function MiniCalendar() {
  const allTasks = useTaskStore((s) => s.tasks)
  const tasks = useMemo(() => activeTasks(allTasks).filter((t) => t.dueDate), [allTasks])

  const today = todayStr()
  const [view, setView] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const dueMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (t.dueDate) map.set(t.dueDate, (map.get(t.dueDate) ?? 0) + 1)
    }
    return map
  }, [tasks])

  const { year, month } = view
  // 周一开头
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = `${year} 年 ${month + 1} 月`
  const monthName = new Date(year, month, 1)
    .toLocaleDateString('zh-CN', { month: 'long' })

  const shift = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold tracking-wide text-txt-secondary">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            onClick={() => shift(-1)}
            className="cursor-pointer rounded-lg p-1 text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-secondary"
            aria-label="上个月"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => {
              const d = new Date()
              setView({ year: d.getFullYear(), month: d.getMonth() })
            }}
            className="cursor-pointer rounded-lg px-1.5 text-[11px] text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-secondary"
          >
            今
          </button>
          <button
            onClick={() => shift(1)}
            className="cursor-pointer rounded-lg p-1 text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-secondary"
            aria-label="下个月"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
          <span key={w} className="pb-1 text-[11px] text-txt-muted">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`x-${i}`} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = dueMap.get(key) ?? 0
          const isToday = key === today
          return (
            <div key={key} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg text-xs tabular-nums',
                  isToday && 'neon-gradient-bg font-bold text-white',
                  !isToday && count > 0 && 'bg-surface-3 text-txt-primary',
                  !isToday && count === 0 && 'text-txt-secondary',
                )}
              >
                {day}
              </span>
              {count > 0 && !isToday && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-accent-solid" title={`${count} 个截止`} />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-txt-muted">
        {monthName} · 圆点 = 有任务截止的日子
      </p>
    </Card>
  )
}
