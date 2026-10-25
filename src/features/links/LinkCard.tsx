import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import type { LinkItem } from '@/lib/data/types'
import { cn } from '@/lib/utils'

/** 按名称哈希选一个渐变配色,同一链接每次渲染颜色稳定 */
const GRADIENTS = [
  'from-cyan-500/70 to-blue-600/70',
  'from-violet-500/70 to-fuchsia-600/70',
  'from-amber-500/70 to-orange-600/70',
  'from-emerald-500/70 to-teal-600/70',
  'from-rose-500/70 to-pink-600/70',
  'from-sky-500/70 to-indigo-600/70',
]

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function LinkCard({ link, onEdit, onDelete }: {
  link: LinkItem
  onEdit: (link: LinkItem) => void
  onDelete: (link: LinkItem) => void
}) {
  let hash = 0
  for (const ch of link.name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const gradient = GRADIENTS[hash % GRADIENTS.length]

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card glass-card-hover group flex items-center gap-3 p-4"
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base font-bold text-white',
          gradient,
        )}
      >
        {link.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{link.name}</p>
        <p className="truncate text-xs text-txt-muted">{hostOf(link.url)}</p>
      </div>
      <ExternalLink size={14} className="shrink-0 text-txt-muted opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="hidden shrink-0 gap-1 group-hover:flex">
        <button
          onClick={(e) => {
            e.preventDefault()
            onEdit(link)
          }}
          className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-surface-3 hover:text-txt-primary"
          aria-label="编辑"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            onDelete(link)
          }}
          className="cursor-pointer rounded-md p-1 text-txt-muted hover:bg-rose-500/15 hover:text-danger"
          aria-label="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </a>
  )
}
