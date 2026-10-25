import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Habit, HabitColor } from '@/lib/data/types'
import { HABIT_COLORS } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { useHabitStore } from '@/stores/habitStore'
import { HABIT_COLOR_META, HABIT_EMOJIS } from './habitMeta'

interface HabitModalProps {
  open: boolean
  onClose: () => void
  habit?: Habit | null
}

export function HabitModal({ open, onClose, habit }: HabitModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [color, setColor] = useState<HabitColor>('cyan')
  const { add, update } = useHabitStore()

  useEffect(() => {
    if (!open) return
    if (habit) {
      setName(habit.name)
      setIcon(habit.icon)
      setColor(habit.color)
    } else {
      setName('')
      setIcon('💪')
      setColor('cyan')
    }
  }, [open, habit])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (habit) await update(habit.id, { name: name.trim(), icon, color })
    else await add({ name: name.trim(), icon, color })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? '编辑习惯' : '新建习惯'} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">习惯名称 *</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如:每天喝够 8 杯水"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">图标</label>
          <div className="flex flex-wrap gap-1.5">
            {HABIT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcon(e)}
                className={cn(
                  'h-9 w-9 cursor-pointer rounded-xl border text-base transition-all',
                  icon === e
                    ? 'border-accent bg-accent-soft'
                    : 'border-line-2 bg-surface-1 opacity-70 hover:opacity-100',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">颜色</label>
          <div className="flex gap-2">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'h-6 w-6 cursor-pointer rounded-full transition-all',
                  HABIT_COLOR_META[c].dot,
                  color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink-900' : 'opacity-60 hover:opacity-100',
                )}
                aria-label={`颜色:${c}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {habit ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
