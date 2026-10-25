import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Goal, GoalColor } from '@/lib/data/types'
import { GOAL_COLORS } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { useGoalStore } from '@/stores/goalStore'
import { GOAL_COLOR_META } from './goalMeta'

interface GoalModalProps {
  open: boolean
  onClose: () => void
  goal?: Goal | null
  /** 现有标签供选择 */
  allTags: string[]
}

const GOAL_EMOJIS = ['🎯', '🚀', '💪', '📚', '💰', '🏆', '🌱', '🧠', '❤️', '🌏']

export function GoalModal({ open, onClose, goal, allTags }: GoalModalProps) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [color, setColor] = useState<GoalColor>('cyan')
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [tag, setTag] = useState('')
  const [manualProgress, setManualProgress] = useState(0)
  const [deadline, setDeadline] = useState('')
  const { add, update } = useGoalStore()

  useEffect(() => {
    if (!open) return
    if (goal) {
      setTitle(goal.title)
      setEmoji(goal.emoji)
      setColor(goal.color)
      setMode(goal.mode)
      setTag(goal.tag ?? '')
      setManualProgress(goal.manualProgress)
      setDeadline(goal.deadline ?? '')
    } else {
      setTitle('')
      setEmoji('🎯')
      setColor('cyan')
      setMode('auto')
      setTag('')
      setManualProgress(0)
      setDeadline('')
    }
  }, [open, goal])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      emoji,
      color,
      tag: mode === 'auto' ? tag.trim().replace(/^#/, '') || null : null,
      mode,
      manualProgress: mode === 'manual' ? manualProgress : 0,
      deadline: deadline || null,
    }
    if (goal) await update(goal.id, payload)
    else await add(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? '编辑目标' : '新建目标'} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="目标:例如 完成 SaaS 上线" className="flex-1" />
          <button
            type="button"
            onClick={() => setEmoji(GOAL_EMOJIS[(GOAL_EMOJIS.indexOf(emoji) + 1) % GOAL_EMOJIS.length])}
            className="flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[0.625rem] border border-line-2 text-lg transition-colors hover:border-accent"
            title="换个图标"
          >
            {emoji}
          </button>
        </div>

        {/* 进度模式 */}
        <div className="flex rounded-xl border border-line-2 bg-surface-1 p-1">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={cn(
              'flex-1 cursor-pointer rounded-lg py-1.5 text-xs transition-all',
              mode === 'auto' ? 'bg-surface-4 font-medium text-txt-primary' : 'text-txt-muted',
            )}
          >
            自动统计(按标签)
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              'flex-1 cursor-pointer rounded-lg py-1.5 text-xs transition-all',
              mode === 'manual' ? 'bg-surface-4 font-medium text-txt-primary' : 'text-txt-muted',
            )}
          >
            手动进度条
          </button>
        </div>

        {mode === 'auto' ? (
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">
              关联标签:打了这个标签的任务,完成率即目标进度
            </label>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="例如:saas(不带 #)" list="goal-tags" />
            <datalist id="goal-tags">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {allTags.length === 0 && <p className="mt-1 text-[11px] text-txt-muted">还没有带标签的任务,标签可以在任务里设置</p>}
          </div>
        ) : (
          <div>
            <label className="mb-1.5 flex justify-between text-xs text-txt-secondary">
              <span>当前进度</span>
              <span className="font-mono">{manualProgress}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={manualProgress}
              onChange={(e) => setManualProgress(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">截止日期(可选)</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">颜色</label>
            <div className="flex h-9 items-center gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-5 w-5 cursor-pointer rounded-full transition-all',
                    GOAL_COLOR_META[c].dot,
                    color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink-900' : 'opacity-60 hover:opacity-100',
                  )}
                  aria-label={`颜色:${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            {goal ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
