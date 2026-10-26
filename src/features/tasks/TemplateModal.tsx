import { useState } from 'react'
import { Check, LayoutTemplate } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTaskStore } from '@/stores/taskStore'
import { TASK_TEMPLATES, type TaskTemplate } from './templates'
import { toast } from '@/stores/toastStore'
import { cn, todayStr } from '@/lib/utils'

/**
 * 任务模板库:一键把一套清单批量生成任务(Notion/Todoist 式)。
 * 每个任务自动带上模板名标签,截止日按相对天数换算。
 */
export function TemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useTaskStore((s) => s.add)
  const [activeId, setActiveId] = useState<string>(TASK_TEMPLATES[0].id)
  const [generating, setGenerating] = useState(false)
  const [doneIds, setDoneIds] = useState<string[]>([])

  const active = TASK_TEMPLATES.find((t) => t.id === activeId) ?? TASK_TEMPLATES[0]

  const dueFromOffset = (offset?: number) => {
    if (offset === undefined) return null
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const generate = async (tpl: TaskTemplate) => {
    setGenerating(true)
    try {
      for (const item of tpl.items) {
        await add({
          title: item.title,
          priority: item.priority ?? 'medium',
          dueDate: dueFromOffset(item.dueOffsetDays),
          tags: [tpl.name],
        })
      }
      setDoneIds((ids) => [...ids, tpl.id])
      toast.success(`已生成 ${tpl.items.length} 个任务`, `${tpl.emoji} ${tpl.name} · 已带模板标签,可在任务中心查看`)
    } catch (err) {
      toast.error('生成失败', err instanceof Error ? err.message : '请重试')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="任务模板库">
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-txt-muted">
          一键把一套清单批量生成任务(Notion/Todoist 式)。生成的任务自带模板标签与截止日,生成后可自由修改。
        </p>
        <div className="grid max-h-[26rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {TASK_TEMPLATES.map((tpl) => {
            const done = doneIds.includes(tpl.id)
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveId(tpl.id)}
                className={cn(
                  'cursor-pointer rounded-2xl border p-3.5 text-left transition-all',
                  activeId === tpl.id
                    ? 'border-accent bg-accent-soft'
                    : 'border-line-2 bg-surface-1 hover:border-line-strong',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tpl.emoji}</span>
                  <p className="flex-1 truncate text-sm font-semibold">{tpl.name}</p>
                  {done && (
                    <span className="flex items-center gap-1 rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
                      <Check size={10} />
                      已生成
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-txt-muted">{tpl.desc} · {tpl.items.length} 项</p>
              </button>
            )
          })}
        </div>

        {/* 选中模板的条目预览 */}
        <div className="rounded-2xl border border-line-2 bg-surface-1 p-3.5">
          <p className="mb-2 text-xs font-semibold text-txt-secondary">
            {active.emoji} {active.name} · 包含 {active.items.length} 项
          </p>
          <ul className="flex flex-col gap-1.5">
            {active.items.map((item) => (
              <li key={item.title} className="flex items-center gap-2 text-xs text-txt-secondary">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                {item.dueOffsetDays !== undefined && (
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-txt-muted">
                    {item.dueOffsetDays === 0 ? '今天' : `+${item.dueOffsetDays} 天`}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-txt-muted">标签:{active.name} · 截止日从今天起算</p>
            <Button variant="primary" size="sm" disabled={generating} onClick={() => void generate(active)}>
              <LayoutTemplate size={13} />
              {generating ? '生成中…' : `一键生成(${todayStr()})`}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
