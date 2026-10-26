import { useState } from 'react'
import { useNavigate } from 'react-router'
import { exportData } from '@/lib/backup'
import { isCloudMode } from '@/lib/config'
import { useDailyStore } from '@/stores/dailyStore'
import { useExpenseStore } from '@/stores/expenseStore'
import { useGoalStore } from '@/stores/goalStore'
import { useHabitStore } from '@/stores/habitStore'
import { useLinkStore } from '@/stores/linkStore'
import { useMemoStore } from '@/stores/memoStore'
import { useMilestoneStore } from '@/stores/milestoneStore'
import { useNoteStore } from '@/stores/noteStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTaskStore } from '@/stores/taskStore'
import { useWorkStore } from '@/stores/workStore'

/** 提醒阈值:距上次导出(或首次打开)超过 N 天 */
const REMIND_AFTER_DAYS = 7
const DISMISS_KEY = 'nexus-backup-dismissed'

/**
 * 本地模式数据备份提醒(全局提示条,样式对齐到期提醒条):
 * 库里还有数据、且距上次导出/首次打开超过 7 天时,每次会话温和提示一次;
 * 点「导出备份」直接走 exportData(时间戳在 backup.ts 内统一记录)。
 */
export function BackupReminder() {
  const navigate = useNavigate()
  const lastExportAt = useSettingsStore((s) => s.lastExportAt)
  const firstOpenedAt = useSettingsStore((s) => s.firstOpenedAt)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const [exporting, setExporting] = useState(false)

  // 库里是否还有任何数据:空库不提醒(钩子顺序固定,数量可忽略)
  const counts = [
    useTaskStore((s) => s.tasks.length),
    useNoteStore((s) => s.notes.length),
    useLinkStore((s) => s.links.length),
    useHabitStore((s) => s.habits.length),
    useMilestoneStore((s) => s.milestones.length),
    useDailyStore((s) => s.dailies.length),
    useGoalStore((s) => s.goals.length),
    useWorkStore((s) => s.works.length),
    useMemoStore((s) => s.memos.length),
    useExpenseStore((s) => s.expenses.length),
  ]
  const hasData = counts.some((n) => n > 0)

  const anchor = lastExportAt ?? firstOpenedAt
  const days = anchor ? Math.floor((Date.now() - new Date(anchor).getTime()) / 86_400_000) : 0
  if (isCloudMode || !hasData || dismissed || days < REMIND_AFTER_DAYS) return null

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-accent/25 bg-accent/10 px-6 py-2 text-xs">
      <span className="text-accent">🛟</span>
      <span className="text-txt-secondary">
        本地数据已 <b className="text-accent">{days}</b> 天未备份——清理浏览器缓存会清空全部数据,建议先导出一份
      </span>
      <button
        onClick={async () => {
          setExporting(true)
          try {
            await exportData()
          } finally {
            setExporting(false)
          }
        }}
        disabled={exporting}
        className="cursor-pointer rounded-md bg-accent/20 px-2.5 py-1 font-medium text-accent transition-colors hover:bg-accent/30 disabled:opacity-60"
      >
        {exporting ? '导出中…' : '导出备份'}
      </button>
      <button
        onClick={() => navigate('/stats')}
        className="cursor-pointer rounded-md px-2 py-1 text-txt-muted transition-colors hover:text-txt-secondary"
        title="去数据看板管理备份"
      >
        数据看板
      </button>
      <button
        onClick={() => {
          setDismissed(true)
          sessionStorage.setItem(DISMISS_KEY, '1')
        }}
        className="ml-auto cursor-pointer text-txt-muted transition-colors hover:text-txt-secondary"
        title="本次会话不再提醒"
      >
        ✕
      </button>
    </div>
  )
}
