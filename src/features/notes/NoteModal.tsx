import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, Link2, Pencil, Pin, PinOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { NewNote, Note, NoteColor } from '@/lib/data/types'
import { NOTE_COLORS } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { renderMarkdown } from '@/lib/markdown'
import { useNoteStore } from '@/stores/noteStore'
import { NOTE_COLOR_META } from './noteMeta'

interface NoteModalProps {
  open: boolean
  onClose: () => void
  note?: Note | null
}

export function NoteModal({ open, onClose, note }: NoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState<NoteColor>('cyan')
  const [pinned, setPinned] = useState(false)
  const [preview, setPreview] = useState(false)
  const { add, update } = useNoteStore()
  const allNotes = useNoteStore((s) => s.notes)
  // 反向链接(Obsidian 式):哪些笔记用 [[标题]] 引用了当前笔记
  const backlinks = useMemo(
    () => (note ? allNotes.filter((n) => n.id !== note.id && !n.deletedAt && n.content.includes(`[[${note.title}]]`)) : []),
    [allNotes, note],
  )

  useEffect(() => {
    if (!open) return
    setPreview(false)
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setColor(note.color)
      setPinned(note.pinned)
    } else {
      setTitle('')
      setContent('')
      setColor('cyan')
      setPinned(false)
    }
  }, [open, note])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() && !content.trim()) return
    const payload: NewNote = {
      title: title.trim() || content.trim().slice(0, 20),
      content: content.trim(),
      color,
      pinned,
    }
    if (note) await update(note.id, payload)
    else await add(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={note ? '编辑便签' : '新建便签'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题(可留空)"
          />
          <button
            type="button"
            onClick={() => setPinned((p) => !p)}
            className={cn(
              'flex h-9 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[0.625rem] border transition-all',
              pinned
                ? 'border-amber-400/40 bg-amber-400/10 text-warn'
                : 'border-line-3 text-txt-muted hover:text-txt-secondary',
            )}
            title={pinned ? '取消置顶' : '置顶'}
          >
            {pinned ? <Pin size={15} fill="currentColor" /> : <PinOff size={15} />}
          </button>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-txt-secondary">内容(支持 Markdown)</label>
            <div className="flex rounded-lg border border-line-2 bg-surface-1 p-0.5">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition-all',
                  !preview ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary',
                )}
              >
                <Pencil size={11} />
                编辑
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] transition-all',
                  preview ? 'bg-surface-4 text-txt-primary' : 'text-txt-muted hover:text-txt-secondary',
                )}
              >
                <Eye size={11} />
                预览
              </button>
            </div>
          </div>
          {preview ? (
            <div
              className="md-body input-base min-h-[11.5rem] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          ) : (
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'写点什么…\n支持 **加粗**、`代码`、- 列表、# 标题'}
              className="font-mono text-[13px]"
              autoFocus={!note}
            />
          )}
        </div>
        {note && backlinks.length > 0 && (
          <div className="border-t border-line-1 pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-txt-muted">
              <Link2 size={12} />
              反向链接({backlinks.length})——这些笔记引用了本篇
            </p>
            <div className="flex flex-wrap gap-1.5">
              {backlinks.map((b) => (
                <span key={b.id} className="max-w-56 truncate rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-txt-secondary" title={b.content.slice(0, 120)}>
                  {b.title || '无标题'}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'h-5 w-5 cursor-pointer rounded-full transition-all',
                  NOTE_COLOR_META[c].dot,
                  color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink-900' : 'opacity-60 hover:opacity-100',
                )}
                aria-label={`颜色:${c}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim() && !content.trim()}>
              {note ? '保存' : '创建'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
