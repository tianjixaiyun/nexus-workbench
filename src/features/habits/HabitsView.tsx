import { useMemo, useState } from 'react'
import { Check, Flame, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Habit, HabitColor } from '@/lib/data/types'
import { cn, todayStr } from '@/lib/utils'
import { streakOf, totalOf, useHabitStore } from '@/stores/habitStore'
import { HabitModal } from './HabitModal'
import { HABIT_COLOR_META, recentDayKeys } from './habitMeta'

/** 最近 14 天打卡点条 */
function HabitStrip({ dates, color }: { dates: string[]; color: HabitColor }) {
  const days = useMemo(() => recentDayKeys(14), [])
  const done = new Set(dates)
  return (
    <div className="flex items-center gap-1">
      {days.map((key) => (
        <span
          key={key}
          title={key}
          className={cn(
            'h-2.5 w-2.5 rounded-[4px] transition-colors',
            done.has(key) ? HABIT_COLOR_META[color].dot : 'bg-surface-3',
            key === todayStr() && 'ring-1 ring-accent',
          )}
        />
      ))}
    </div>
  )
}

export function HabitsView() {
  const { habits, loaded, toggleToday, remove } = useHabitStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const today = todayStr()
  const checkedToday = habits.filter((h) => h.dates.includes(today)).length

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (habit: Habit) => {
    setEditing(habit)
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
      {/* 今日进度总览 */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide">今日打卡</p>
          <p className="mt-1 text-xs text-txt-muted">
            {habits.length === 0
              ? '建立第一个习惯,让坚持看得见'
              : `已完成 ${checkedToday} / ${habits.length} · 全部完成时记得奖励自己`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {habits.length > 0 && (
            <div className="flex gap-1.5">
              {habits.map((h) => (
                <span
                  key={h.id}
                  title={h.name}
                  className={cn(
                    'h-2.5 w-6 rounded-full transition-colors',
                    h.dates.includes(today) ? HABIT_COLOR_META[h.color].dot : 'bg-surface-3',
                  )}
                />
              ))}
            </div>
          )}
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} />
            新建习惯
          </Button>
        </div>
      </Card>

      {habits.length === 0 ? (
        <EmptyState icon={Flame} title="还没有习惯" hint="微习惯最容易坚持:从每天 5 分钟开始">
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} />
            新建习惯
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => {
            const doneToday = habit.dates.includes(today)
            const streak = streakOf(habit)
            return (
              <Card key={habit.id} className="glass-card-hover group relative flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-lg', HABIT_COLOR_META[habit.color].tint)}>
                      {habit.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{habit.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-txt-muted">
                        <Flame size={12} className={cn(streak > 0 ? 'text-warn' : 'text-txt-muted')} />
                        连续 {streak} 天 · 累计 {totalOf(habit)} 次
                      </p>
                    </div>
                  </div>
                  <div className="hidden shrink-0 gap-1 group-hover:flex">
                    <button
                      onClick={() => openEdit(habit)}
                      className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-surface-3 hover:text-txt-primary"
                      aria-label="编辑"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(habit.id)}
                      className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-rose-500/15 hover:text-danger"
                      aria-label="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <HabitStrip dates={habit.dates} color={habit.color} />

                <button
                  onClick={() => void toggleToday(habit.id)}
                  className={cn(
                    'flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm transition-all',
                    doneToday
                      ? cn('border-transparent font-medium', HABIT_COLOR_META[habit.color].tint, HABIT_COLOR_META[habit.color].text)
                      : 'border-line-3 text-txt-secondary hover:border-accent hover:text-txt-primary',
                  )}
                >
                  {doneToday ? (
                    <>
                      <Check size={16} />
                      今天已完成
                    </>
                  ) : (
                    '打卡'
                  )}
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <HabitModal open={modalOpen} onClose={() => setModalOpen(false)} habit={editing} />

      <ConfirmDialog
        open={deleteId !== null}
        message="删除后该习惯的打卡记录也会一并删除,确定吗?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void remove(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
