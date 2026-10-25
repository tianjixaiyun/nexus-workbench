import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckSquare, StickyNote, Zap } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { parseNaturalLanguage } from '@/lib/nlp'
import { formatDate } from '@/lib/utils'
import { useNoteStore } from '@/stores/noteStore'
import { useTaskStore } from '@/stores/taskStore'

/**
 * 快速捕捉(flomo 式):任意页面秒记一条。
 * #标签 自动解析成任务标签;第一行作为标题;存任务或存便签一键完成。
 */

interface QuickCaptureProps {
  open: boolean
  onClose: () => void
}

function parseCapture(raw: string): { title: string; body: string; tags: string[] } {
  const tags = [...raw.matchAll(/#([^\s#]+)/g)].map((m) => m[1])
  const cleaned = raw.replace(/#[^\s#]+/g, '').replace(/[ \t]+$/gm, '')
  const lines = cleaned.split('\n').map((l) => l.trim())
  const title = lines[0] ?? ''
  const body = lines.slice(1).join('\n').trim()
  return { title, body, tags: [...new Set(tags)] }
}

export function QuickCapture({ open, onClose }: QuickCaptureProps) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  const { add: addNote } = useNoteStore()
  const { add: addTask } = useTaskStore()

  useEffect(() => {
    if (open) {
      setText('')
      setSaved('')
    }
  }, [open])

  const { tags } = parseCapture(text)
  const parsed = parseNaturalLanguage(text)
  const canSave = parsed.cleaned.trim().length > 0

  const saveTask = async () => {
    const lines = parsed.cleaned.split('\n').map((l) => l.trim())
    await addTask({
      title: lines[0],
      description: lines.slice(1).join('\n').trim(),
      tags,
      dueDate: parsed.dueDate,
      recurrence: parsed.recurrence ?? 'none',
      priority: parsed.priority ?? 'medium',
    })
    setSaved('已存入任务中心 ✓')
    setTimeout(onClose, 550)
  }

  const saveNote = async () => {
    // 便签保留原文(含 #标签,flomo 风格),无标题则空
    await addNote({ title: text.split('\n')[0].replace(/#[^\s#]+/g, '').trim().slice(0, 30), content: text.trim(), color: 'cyan' })
    setSaved('已存入便签墙 ✓')
    setTimeout(onClose, 550)
  }

  return createPortal(
    <Modal open={open} onClose={onClose} title="快速捕捉" className="max-w-lg">
      <div className="flex items-center gap-1.5 mb-2 text-[11px] text-txt-muted">
        <Zap size={11} className="text-accent" />
        随手记一条,<code className="rounded bg-surface-3 px-1">#标签</code> 会自动变成任务的标签,第一行是标题
      </div>
      <Textarea
        autoFocus
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'例如:\n明天要给客户发方案 #工作 #重要\n记得附上报价单'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSave) void saveTask()
        }}
      />
      {(tags.length > 0 || parsed.matched.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
              #{t}
            </span>
          ))}
          {parsed.dueDate && (
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] text-success">
              📅 {formatDate(parsed.dueDate)}
            </span>
          )}
          {parsed.recurrence && parsed.recurrence !== 'none' && (
            <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[11px] text-accent-2">
              🔁 {parsed.recurrence === 'daily' ? '每天' : parsed.recurrence === 'weekly' ? '每周' : '每月'}
            </span>
          )}
          {parsed.priority && (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-warn">
              ⚡ {{ high: '高', medium: '中', low: '低' }[parsed.priority]}优先级
            </span>
          )}
        </div>
      )}
      {saved ? (
        <p className="mt-4 text-center text-sm text-success">{saved}</p>
      ) : (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={saveNote} disabled={!canSave}>
            <StickyNote size={14} />
            存为便签
          </Button>
          <Button variant="primary" onClick={saveTask} disabled={!canSave}>
            <CheckSquare size={14} />
            存为任务
          </Button>
        </div>
      )}
      <p className="mt-3 text-right text-[10px] text-txt-muted">Ctrl + Enter 直接存为任务 · 随时按 Q 唤起</p>
    </Modal>,
    document.body,
  )
}

/** 右下角浮动捕捉按钮(全局) */
export function QuickCaptureFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="neon-gradient-bg glow-cyan fixed right-6 bottom-6 z-40 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-110"
      title="快速捕捉 (Q)"
      aria-label="快速捕捉"
    >
      <Zap size={20} />
    </button>
  )
}
