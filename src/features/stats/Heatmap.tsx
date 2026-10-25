import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface HeatmapProps {
  /** key: YYYY-MM-DD → 数值 */
  counts: Map<string, number>
  /** 展示的周数(列数) */
  weeks: number
  className?: string
}

const LEVELS = [
  'bg-surface-1',
  'bg-hm-1',
  'bg-hm-2',
  'bg-hm-3',
  'bg-hm-4',
]

function levelOf(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

/** GitHub 风贡献热力图:每列一周(周一在第一行) */
export function Heatmap({ counts, weeks, className }: HeatmapProps) {
  const columns = useMemo(() => {
    const today = new Date()
    // 结束于今天所在周(含今天),向前推 weeks 列
    const end = new Date(today)
    end.setDate(end.getDate() + (7 - ((end.getDay() + 6) % 7) - 1)) // 本周日
    const cols: { key: string; count: number; isFuture: boolean }[][] = []
    for (let w = weeks - 1; w >= 0; w--) {
      const col: { key: string; count: number; isFuture: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const day = new Date(end)
        day.setDate(day.getDate() - w * 7 - (6 - d))
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        col.push({ key, count: counts.get(key) ?? 0, isFuture: day > today })
      }
      cols.push(col)
    }
    return cols
  }, [counts, weeks])

  return (
    <div className={cn('flex gap-[3px]', className)}>
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {col.map(({ key, count, isFuture }) => (
            <span
              key={key}
              title={`${key}${count ? ` · ${count} 次` : ''}`}
              className={cn(
                'h-3 w-3 rounded-[3px] transition-colors',
                isFuture ? 'bg-transparent' : LEVELS[levelOf(count)],
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-txt-muted">
      <span>少</span>
      {LEVELS.map((cls, i) => (
        <span key={i} className={cn('h-2.5 w-2.5 rounded-[3px]', cls)} />
      ))}
      <span>多</span>
    </div>
  )
}
