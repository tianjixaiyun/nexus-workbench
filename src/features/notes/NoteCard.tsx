import { Pencil, Pin, Trash2 } from 'lucide-react'
import type { Note } from '@/lib/data/types'
import { cn, formatIsoDate } from '@/lib/utils'
import { renderMarkdown } from '@/lib/markdown'
import { NOTE_COLOR_META } from './noteMeta'

interface NoteCardProps {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  draggable?: boolean
}

export function NoteCard({ note, onEdit, onDelete, draggable }: NoteCardProps) {
  const meta = NOTE_COLOR_META[note.color]
  return (
    <div
      onClick={() => onEdit(note)}
      className={cn(
        'glass-card glass-card-hover group/note mb-4 break-inside-avoid border-l-4 p-4',
        meta.stripe,
        meta.tint,
        draggable && 'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm leading-snug font-medium break-all">{note.title || '无标题'}</p>
        {note.pinned && <Pin size={13} className="mt-0.5 shrink-0 text-warn" fill="currentColor" />}
      </div>
      {note.content && (
        <div
          className="md-body mt-2 line-clamp-10 text-xs leading-relaxed text-txt-secondary"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
        />
      )}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-txt-muted">{formatIsoDate(note.updatedAt)}</span>
        <div className="hidden gap-1 group-hover/note:flex">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(note)
            }}
            className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-surface-3 hover:text-txt-primary"
            aria-label="编辑"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(note)
            }}
            className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-rose-500/15 hover:text-danger"
            aria-label="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
