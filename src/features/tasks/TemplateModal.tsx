import { useEffect, useRef, useState } from 'react'
import { Check, LayoutTemplate } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTaskStore } from '@/stores/taskStore'
import { useAuthStore } from '@/stores/authStore'
import { isCloudMode } from '@/lib/config'
import { Input, Textarea } from '@/components/ui/Input'
import { TASK_TEMPLATES, type TaskTemplate } from './templates'
import { CUSTOM_TEMPLATE_KEY, templateFromText, validateCustomTemplates, type CustomTemplate } from './customTemplates'
import { saveCaptureRows, type CaptureRow } from './taskCapture'
import { shiftDay } from './taskFilters'
import { toast } from '@/stores/toastStore'
import { cn, todayStr, uid } from '@/lib/utils'

/**
 * 任务模板库:一键把一套清单批量生成任务(Notion/Todoist 式)。
 * 每个任务自动带上模板名标签,截止日按相对天数换算。
 */
export function TemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeId, setActiveId] = useState<string>(TASK_TEMPLATES[0].id)
  const [generating, setGenerating] = useState(false)
  const [doneIds, setDoneIds] = useState<string[]>([])
  const [custom, setCustom] = useState<CustomTemplate[]>([])
  const [storageError, setStorageError] = useState('')
  const [editorId, setEditorId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftItems, setDraftItems] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<CaptureRow[]>([])
  const lock = useRef(false)
  const mounted = useRef(true)
  const storedRaw = useRef<string | null>(null)
  const owner = useAuthStore(state => state.user?.id)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!open || isCloudMode) return
    try { const raw = localStorage.getItem(CUSTOM_TEMPLATE_KEY); setCustom(validateCustomTemplates(JSON.parse(raw ?? '[]'))); storedRaw.current = raw; setStorageError('') }
    catch { setCustom([]); setStorageError('个人模板数据无法读取。原数据已保留，请先检查备份和本机存储。') }
  }, [open, owner])
  useEffect(() => { setEditorId(null); setPending([]); setError(''); setActiveId(TASK_TEMPLATES[0].id) }, [owner])

  const allTemplates: TaskTemplate[] = [...TASK_TEMPLATES, ...(!isCloudMode ? custom.map(template => ({ ...template, emoji: '✨', desc: '本机个人模板' })) : [])]
  const active = allTemplates.find((t) => t.id === activeId) ?? TASK_TEMPLATES[0]
  const activeCustom = custom.find(template => template.id === activeId)

  const requestClose = () => {
    if (lock.current) return
    if (editorId && (draftName.trim() || draftItems.trim()) && !confirm('模板编辑内容尚未保存，确定关闭吗？')) return
    setEditorId(null); setError(''); setPending([]); onClose()
  }
  const saveTemplate = () => {
    if (storageError || !editorId) return
    try {
      const nextTemplate = templateFromText(editorId === 'new' ? `custom-${uid()}` : editorId, draftName, draftItems)
      const next = validateCustomTemplates(editorId === 'new' ? [...custom, nextTemplate] : custom.map(item => item.id === editorId ? nextTemplate : item))
      if (localStorage.getItem(CUSTOM_TEMPLATE_KEY) !== storedRaw.current) throw new Error('模板已在其他页面更改；编辑内容仍在，请复制后重新打开模板库。')
      const raw = JSON.stringify(next)
      localStorage.setItem(CUSTOM_TEMPLATE_KEY, raw)
      storedRaw.current = raw
      setCustom(next); setActiveId(nextTemplate.id); setEditorId(null); setError('')
    } catch (cause) { setError(cause instanceof DOMException ? '本机存储不可用，模板未保存；编辑内容仍在这里。' : cause instanceof Error ? cause.message : '保存模板失败，编辑内容仍在这里。') }
  }
  const deleteTemplate = () => {
    if (!activeCustom || storageError || !confirm(`删除模板“${activeCustom.name}”？已经生成的任务不会删除。`)) return
    try { if (localStorage.getItem(CUSTOM_TEMPLATE_KEY) !== storedRaw.current) throw new Error('模板已在其他页面更改，请重新打开模板库后再操作。'); const next = custom.filter(item => item.id !== activeCustom.id); const raw = JSON.stringify(next); localStorage.setItem(CUSTOM_TEMPLATE_KEY, raw); storedRaw.current = raw; setCustom(next); setActiveId(TASK_TEMPLATES[0].id); setEditorId(null); setError('') }
    catch (cause) { setError(cause instanceof DOMException ? '本机存储不可用，删除未保存。' : cause instanceof Error ? cause.message : '删除未保存，请重试。') }
  }

  const generate = async (tpl: TaskTemplate) => {
    const requestOwner = useAuthStore.getState().user?.id
    if (lock.current || !requestOwner || pending.length) return
    const current = () => mounted.current && useAuthStore.getState().ready && useAuthStore.getState().user?.id === requestOwner
    const startDay = todayStr()
    const rows: CaptureRow[] = tpl.items.map((item, index) => ({ line: index + 1, raw: item.title, input: { title: item.title, priority: item.priority ?? 'medium', dueDate: item.dueOffsetDays === undefined ? null : shiftDay(startDay, item.dueOffsetDays), tags: [tpl.name] } }))
    lock.current = true; setGenerating(true); setError('')
    const result = await saveCaptureRows(rows, input => useTaskStore.getState().add(input), current)
    lock.current = false
    if (!current()) { if (mounted.current) setGenerating(false); return }
    setGenerating(false)
    if (result.remaining.length) {
      setPending(result.remaining)
      setError(`已确认生成 ${result.completed} 项，${result.remaining.length} 项未确认。网络异常时最后一项可能已写入，请关闭后检查任务列表再操作。`)
    } else {
      setDoneIds(ids => [...ids, tpl.id])
      toast.success(`已生成 ${tpl.items.length} 个任务`, `${tpl.emoji} ${tpl.name} · 已带模板标签`)
    }
  }

  return (
    <Modal open={open} onClose={requestClose} title="任务模板库">
      <div className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-txt-muted">
          一键把一套清单批量生成任务(Notion/Todoist 式)。生成的任务自带模板标签与截止日,生成后可自由修改。
        </p>
        <p className="text-xs text-txt-secondary">{isCloudMode ? '个人模板目前只在本机模式使用，不会自动同步。' : '个人模板保存在当前设备，可通过 JSON 备份迁移。'}</p>
        {storageError && <p role="alert" className="text-xs text-danger">{storageError}</p>}
        {error && <p role="alert" className="rounded-xl border border-warn/40 p-3 text-xs text-txt-primary">{error}</p>}
        {!isCloudMode && !editorId && <div><Button variant="outline" size="sm" disabled={generating || Boolean(storageError)} onClick={() => { setEditorId('new'); setDraftName(''); setDraftItems(''); setError('') }}>新建个人模板</Button></div>}
        {editorId && <div className="space-y-3 rounded-xl border border-line-2 bg-surface-1 p-3"><label className="block text-xs text-txt-secondary">模板名称<Input aria-label="模板名称" value={draftName} maxLength={60} onChange={e => setDraftName(e.target.value)} className="mt-1" /></label><label className="block text-xs text-txt-secondary">任务清单（每行一项）<Textarea aria-label="模板任务清单" value={draftItems} rows={4} onChange={e => setDraftItems(e.target.value)} className="mt-1" /></label><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => { if (!draftName.trim() && !draftItems.trim() || confirm('放弃尚未保存的模板编辑？')) { setEditorId(null); setError('') } }}>取消编辑</Button><Button size="sm" variant="primary" onClick={saveTemplate}>保存模板</Button></div></div>}
        <div className="grid max-h-[26rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {allTemplates.map((tpl) => {
            const done = doneIds.includes(tpl.id)
            return (
              <button
                key={tpl.id}
                type="button"
                disabled={generating || Boolean(editorId) || pending.length > 0}
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
            {active.items.map((item, index) => (
              <li key={`${index}-${item.title}`} className="flex items-center gap-2 text-xs text-txt-secondary">
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
          {pending.length > 0 && <p className="mt-3 break-words text-xs text-warn">未确认：{pending.map(item => item.input.title).join('、')}</p>}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-txt-muted">标签:{active.name} · 截止日从今天起算</p>
            <Button variant="primary" size="sm" disabled={generating || Boolean(editorId) || pending.length > 0} onClick={() => void generate(active)}>
              <LayoutTemplate size={13} />
              {generating ? '生成中…' : `一键生成(${todayStr()})`}
            </Button>
          </div>
          {activeCustom && !editorId && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={generating || pending.length > 0} onClick={() => { setEditorId(activeCustom.id); setDraftName(activeCustom.name); setDraftItems(activeCustom.items.map(item => item.title).join('\n')); setError('') }}>编辑模板</Button><Button size="sm" variant="danger" disabled={generating || pending.length > 0} onClick={deleteTemplate}>删除模板</Button></div>}
        </div>
      </div>
    </Modal>
  )
}
