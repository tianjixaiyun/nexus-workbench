import { useEffect, useMemo, useState } from 'react'
import { Check, Hash, Loader2, MessageCircle, Pencil, Pin, PinOff, Send, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn, todayStr } from '@/lib/utils'
import { renderMarkdown } from '@/lib/markdown'
import { useMemoStore } from '@/stores/memoStore'

/**
 * 碎碎念:flomo / Memos(64k⭐)式的时间线速记。
 * 一句话就是一条:顶部输入框(#标签 自动解析,Ctrl+Enter 发送),
 * 下方按「今天 / 昨天 / 具体日期」分组的时间线流,标签云筛选,置顶/编辑/删除。
 */

/** 从内容里提取 #标签 */
function extractTags(content: string): string[] {
  const set = new Set<string>()
  for (const m of content.matchAll(/#([^\s#]{1,20})/g)) set.add(m[1])
  return [...set]
}

function dateLabel(dateStr: string): string {
  const today = todayStr()
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  const [y, m, day] = dateStr.split('-').map(Number)
  if (y && m && day) return `${y} 年 ${m} 月 ${day} 日`
  return dateStr
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function MemosView() {
  const { memos, loaded, fetch, add, update, remove } = useMemoStore()
  const [draft, setDraft] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!loaded) void fetch()
  }, [loaded, fetch])

  const tags = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of memos) for (const t of m.tags) map.set(t, (map.get(t) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [memos])

  const filtered = useMemo(
    () => (filterTag ? memos.filter((m) => m.tags.includes(filterTag)) : memos),
    [memos, filterTag],
  )

  /** 按天分组(置顶单独一栏在最上) */
  const groups = useMemo(() => {
    const pinned = filtered.filter((m) => m.pinned)
    const rest = filtered.filter((m) => !m.pinned)
    const byDay = new Map<string, typeof rest>()
    for (const m of rest) {
      const day = m.createdAt.slice(0, 10)
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(m)
    }
    return { pinned, days: [...byDay.entries()] }
  }, [filtered])

  const send = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      await add({ content, tags: extractTags(content), pinned: false })
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  const saveEdit = async () => {
    if (!editingId) return
    const content = editingText.trim()
    if (content) await update(editingId, { content, tags: extractTags(content) })
    setEditingId(null)
  }

  const todayCount = memos.filter((m) => m.createdAt.slice(0, 10) === todayStr()).length

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_220px]">
      {/* 主栏:输入 + 时间线 */}
      <div className="min-w-0 space-y-5">
        {/* 输入卡 */}
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                void send()
              }
            }}
            rows={3}
            placeholder="此刻在想什么?一句话也行,支持 #标签 和 Markdown…(Ctrl+Enter 发送)"
            className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-txt-muted"
          />
          <div className="mt-2 flex items-center justify-between border-t border-line-1 pt-2.5">
            <p className="text-[11px] text-txt-muted">
              今天已记 <span className="font-mono text-accent">{todayCount}</span> 条 · 共 {memos.length} 条
            </p>
            <button
              onClick={() => void send()}
              disabled={!draft.trim() || sending}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} /> 记下
            </button>
          </div>
        </Card>

        {/* 时间线 */}
        {!loaded ? (
          <div className="flex justify-center py-16 text-txt-muted">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={filterTag ? `没有 #${filterTag} 的碎碎念` : '还没有碎碎念'}
            hint={filterTag ? '换个标签,或者去记一条新的' : '想法转瞬即逝——想到什么,随手记下来,时间会替你串成线'}
          />
        ) : (
          <div className="space-y-6">
            {/* 置顶 */}
            {groups.pinned.length > 0 && (
              <div>
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Pin size={12} /> 置顶
                </p>
                <div className="space-y-2.5">
                  {groups.pinned.map((m) => (
                    <MemoCard key={m.id} memo={m} onPin={() => void update(m.id, { pinned: false })}
                      onEdit={() => { setEditingId(m.id); setEditingText(m.content) }}
                      onDelete={() => void remove(m.id)} onTag={setFilterTag}
                      editing={editingId === m.id} editingText={editingText} setEditingText={setEditingText} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)} />
                  ))}
                </div>
              </div>
            )}
            {/* 按日分组 */}
            {groups.days.map(([day, items]) => (
              <div key={day}>
                <p className="mb-2.5 font-mono text-xs tracking-wider text-txt-muted">{dateLabel(day)}</p>
                <div className="relative space-y-2.5 border-l border-line-1 pl-4">
                  {items.map((m) => (
                    <MemoCard key={m.id} memo={m} onPin={() => void update(m.id, { pinned: true })}
                      onEdit={() => { setEditingId(m.id); setEditingText(m.content) }}
                      onDelete={() => void remove(m.id)} onTag={setFilterTag}
                      editing={editingId === m.id} editingText={editingText} setEditingText={setEditingText} saveEdit={saveEdit} cancelEdit={() => setEditingId(null)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 侧栏:标签云 */}
      <aside className="hidden lg:block">
        <Card className="sticky top-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-txt-secondary">
            <Hash size={13} className="text-accent" /> 标签
          </p>
          {tags.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-txt-muted">在内容里写 #标签,它们会聚在这里</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(([t, n]) => (
                <button
                  key={t}
                  onClick={() => setFilterTag((cur) => (cur === t ? null : t))}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-1 text-[11px] transition-colors',
                    filterTag === t ? 'bg-accent text-white' : 'bg-accent-soft text-accent hover:opacity-80',
                  )}
                >
                  #{t} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </aside>
    </div>
  )
}

function MemoCard({ memo, onPin, onEdit, onDelete, onTag, editing, editingText, setEditingText, saveEdit, cancelEdit }: {
  memo: import('@/lib/data/types').Memo
  onPin: () => void
  onEdit: () => void
  onDelete: () => void
  onTag: (t: string) => void
  editing: boolean
  editingText: string
  setEditingText: (v: string) => void
  saveEdit: () => void
  cancelEdit: () => void
}) {
  return (
    <div className="group relative">
      {/* 时间线节点 */}
      <span className="absolute top-4 -left-[21px] h-2 w-2 rounded-full bg-line-strong transition-colors group-hover:bg-accent" />
      <Card className={cn('px-4 py-3 transition-colors', memo.pinned && 'border-accent/40')}>
        {editing ? (
          <div>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveEdit() }
                if (e.key === 'Escape') cancelEdit()
              }}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-accent/40 bg-surface-2 px-3 py-2 text-sm outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={saveEdit} className="flex cursor-pointer items-center gap-1 rounded-md bg-accent px-3 py-1 text-[11px] text-white">
                <Check size={12} /> 保存
              </button>
              <button onClick={cancelEdit} className="flex cursor-pointer items-center gap-1 rounded-md border border-line-2 px-3 py-1 text-[11px] text-txt-secondary">
                <X size={12} /> 取消
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 标签渲染成可点芯片,其余走 markdown */}
            <div className="memo-content text-sm leading-relaxed text-txt-primary">
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(memo.content) }} />
            </div>
            {memo.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {memo.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => onTag(t)}
                    className="cursor-pointer rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent transition-opacity hover:opacity-75"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {/* 悬停操作 */}
        <div className="absolute top-2.5 right-3 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn title={memo.pinned ? '取消置顶' : '置顶'} onClick={onPin}>
            {memo.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </IconBtn>
          <IconBtn title="编辑" onClick={onEdit}><Pencil size={13} /></IconBtn>
          <IconBtn title="删除" onClick={onDelete} danger><Trash2 size={13} /></IconBtn>
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-txt-muted/70">{timeOf(memo.createdAt)}</p>
      </Card>
    </div>
  )
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'cursor-pointer rounded-md p-1.5 text-txt-muted transition-colors hover:bg-surface-3',
        danger ? 'hover:text-danger' : 'hover:text-accent',
      )}
    >
      {children}
    </button>
  )
}
