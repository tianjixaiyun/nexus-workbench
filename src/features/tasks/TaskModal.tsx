import { useLayoutEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { focusContextHref } from '@/lib/contextLinks'
import { taskInitialTags } from './taskFilters'
import { Check, Play, Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import type { Subtask, Task, TaskPriority, TaskRecurrence, TaskStatus } from '@/lib/data/types'
import { TASK_PRIORITIES, TASK_RECURRENCES, TASK_STATUSES } from '@/lib/data/types'
import { cn, uid } from '@/lib/utils'
import { parseNaturalLanguage } from '@/lib/nlp'
import { useTaskStore } from '@/stores/taskStore'

interface TaskModalProps {
  open: boolean
  onClose: () => void
  /** 传入则为编辑模式 */
  task?: Task | null
  /** 新建模式的预设状态(看板某列的 + 按钮) */
  defaultStatus?: TaskStatus
  /** 新建模式的预设截止日期(日历点某天新建) */
  defaultDueDate?: string
  defaultTag?: string
}

interface FormState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  recurrence: TaskRecurrence
  tags: string[]
  subtasks: Subtask[]
}

const emptyForm: FormState = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  recurrence: 'none',
  tags: [],
  subtasks: [],
}

export function TaskModal({ open, onClose, task, defaultStatus = 'todo', defaultDueDate, defaultTag }: TaskModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [subtaskInput, setSubtaskInput] = useState('')
  const [nlHint, setNlHint] = useState<string[]>([])
  const { add, update } = useTaskStore()

  useLayoutEffect(() => {
    if (!open) return
    setError('')
    setTagInput('')
    setSubtaskInput('')
    setNlHint([])
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? '',
        recurrence: task.recurrence ?? 'none',
        tags: taskInitialTags(task, defaultTag),
        subtasks: task.subtasks.map((s) => ({ ...s })),
      })
    } else {
      setForm({ ...emptyForm, status: defaultStatus, dueDate: defaultDueDate ?? '', tags: taskInitialTags(null, defaultTag) })
    }
  }, [open, task, defaultStatus, defaultDueDate, defaultTag])

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !form.tags.includes(tag)) patch({ tags: [...form.tags, tag] })
    setError('')
    setTagInput('')
  }

  const addSubtask = () => {
    const title = subtaskInput.trim()
    if (title) patch({ subtasks: [...form.subtasks, { id: uid(), title, done: false }] })
    setSubtaskInput('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title || saving) return
    const payload = {
      title,
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      recurrence: form.recurrence,
      tags: form.tags,
      subtasks: form.subtasks,
    }
    const goFocus = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-focus') === 'true'
    setSaving(true)
    setError('')
    try {
      if (task) await update(task.id, payload)
      else await add(payload)
      onClose()
      if (goFocus && task) navigate(focusContextHref(task.id))
    } catch {
      setError('保存失败，填写内容仍在这里，请重试。')
    } finally { setSaving(false) }
  }

  const doneSubtasks = form.subtasks.filter((s) => s.done).length

  return (
    <Modal open={open} onClose={() => { if (!saving) onClose() }} title={task ? '编辑任务' : '新建任务'} className="max-w-xl">
      <form onSubmit={handleSubmit} aria-busy={saving} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">标题 *</label>
          <Input
            autoFocus
            aria-label="任务标题"
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            onBlur={() => {
              // Todoist 式自然语言:失焦时识别日期/重复/优先级并自动填入,同时清理标题
              const p = parseNaturalLanguage(form.title)
              if (p.matched.length === 0 || !p.cleaned.trim()) return
              setNlHint(p.matched)
              patch({
                title: p.cleaned,
                dueDate: form.dueDate || p.dueDate || '',
                recurrence: form.recurrence !== 'none' ? form.recurrence : (p.recurrence ?? 'none'),
                priority: form.priority !== 'medium' ? form.priority : (p.priority ?? 'medium'),
              })
            }}
            placeholder="要做什么?支持「明天」「每周三」「p1」…"
          />
          {nlHint.length > 0 && (
            <p className="mt-1 text-[11px] text-success">
              ✓ 已识别并填入:{nlHint.join(' / ')}(日期与重复可在下方修改)
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">描述</label>
          <Textarea
            rows={2}
            aria-label="任务描述"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="补充细节(可选)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">状态</label>
            <Select value={form.status} onChange={(e) => patch({ status: e.target.value as TaskStatus })}>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">优先级</label>
            <Select value={form.priority} onChange={(e) => patch({ priority: e.target.value as TaskPriority })}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">截止日期</label>
            <Input type="date" value={form.dueDate} onChange={(e) => patch({ dueDate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">重复</label>
            <Select
              value={form.recurrence}
              onChange={(e) => patch({ recurrence: e.target.value as TaskRecurrence })}
            >
              {TASK_RECURRENCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* 标签 */}
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">标签(回车添加)</label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-[0.625rem] border border-line-3 bg-surface-1 px-2.5 py-2">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => patch({ tags: form.tags.filter((t) => t !== tag) })}
                  className="cursor-pointer text-accent/60 hover:text-accent"
                  aria-label={`移除标签 ${tag}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag()
                }
              }}
              onBlur={addTag}
              placeholder={form.tags.length === 0 ? '工作 / 学习 / 生活…' : ''}
              className="min-w-24 flex-1 bg-transparent text-sm text-txt-primary outline-none placeholder:text-txt-muted"
            />
          </div>
        </div>

        {/* 子任务 */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs text-txt-secondary">
            <span>子任务清单</span>
            {form.subtasks.length > 0 && (
              <span className="text-txt-muted">
                {doneSubtasks}/{form.subtasks.length} 已完成
              </span>
            )}
          </label>
          {form.subtasks.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {form.subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2">
                  <button
                    type="button"
                    onClick={() =>
                      patch({ subtasks: form.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })
                    }
                    className={cn(
                      'flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-all',
                      s.done ? 'neon-gradient-bg border-transparent' : 'border-line-strong hover:border-accent',
                    )}
                    aria-label={s.done ? '取消完成' : '完成'}
                  >
                    {s.done && <Check size={10} className="text-white" />}
                  </button>
                  <span className={cn('flex-1 text-sm', s.done && 'text-txt-muted line-through')}>{s.title}</span>
                  <button
                    type="button"
                    onClick={() => patch({ subtasks: form.subtasks.filter((x) => x.id !== s.id) })}
                    className="hidden cursor-pointer text-txt-muted hover:text-danger group-hover:block"
                    aria-label="移除子任务"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSubtask()
                }
              }}
              placeholder="拆解一步:例如「先列大纲」"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addSubtask} disabled={!subtaskInput.trim()}>
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          {task && form.status !== 'done' && <Button type="submit" data-focus="true" variant="outline" disabled={saving || !form.title.trim()}><Play size={14} />保存并去专注</Button>}
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !form.title.trim()}>
            {saving ? '保存中…' : task ? '保存' : '创建'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
