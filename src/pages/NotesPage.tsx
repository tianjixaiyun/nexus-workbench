import { useEffect, useMemo, useState } from 'react'
import { Dices, Loader2, Plus, Search, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Note } from '@/lib/data/types'
import { consumeAction } from '@/lib/uiBus'
import { formatIsoDate } from '@/lib/utils'
import { toast } from '@/stores/toastStore'
import { activeNotes, sortNotes, useNoteStore } from '@/stores/noteStore'
import { NoteCard } from '@/features/notes/NoteCard'
import { NoteModal } from '@/features/notes/NoteModal'
import { renderMarkdown } from '@/lib/markdown'

export default function NotesPage() {
  const { notes: allNotes, loaded, softDelete } = useNoteStore()
  const notes = useMemo(() => activeNotes(allNotes), [allNotes])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [random, setRandom] = useState<Note | null>(null)

  // 随机回顾(flomo 式):随机翻出一条旧便签
  const surprise = () => {
    const pool = notes.filter((n) => n.id !== random?.id)
    if (pool.length === 0) return
    setRandom(pool[Math.floor(Math.random() * pool.length)])
  }

  // 命令面板/快捷键的「新建便签」:页面可能刚挂载,从 uiBus 取待办动作
  useEffect(() => {
    const open = () => {
      setEditing(null)
      setModalOpen(true)
    }
    if (consumeAction('new-note')) open()
    window.addEventListener('nexus:action', open)
    return () => window.removeEventListener('nexus:action', open)
  }, [])

  // 笔记双链(Obsidian 式):点击 [[标题]] 跳到对应笔记;不存在则提示
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('[data-wiki]') as HTMLElement | null
      if (!el) return
      e.preventDefault()
      const title = el.getAttribute('data-wiki') ?? ''
      if (!title) return
      const pool = activeNotes(allNotes)
      const target = pool.find((n) => n.title === title) || pool.find((n) => n.title.includes(title))
      if (target) openEdit(target)
      else toast.info('没有找到这篇笔记', `「${title}」还不存在,先创建一条吧`)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNotes])

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return sortNotes(
      kw
        ? notes.filter((n) => `${n.title} ${n.content}`.toLowerCase().includes(kw))
        : notes,
    )
  }, [notes, search])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (note: Note) => {
    setEditing(note)
    setModalOpen(true)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div className="relative max-w-md min-w-52 flex-1">
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-txt-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索笔记…"
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={surprise} disabled={notes.length === 0}>
          <Dices size={15} />
          随机回顾
        </Button>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} />
          新建便签
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={search ? '没有匹配的笔记' : '还没有便签'}
          hint={search ? '换个关键词试试' : '灵感稍纵即逝,点「新建便签」随手记一条'}
        >
          {!search && (
            <Button variant="primary" onClick={openCreate}>
              <Plus size={15} />
              新建便签
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={openEdit}
              onDelete={(n) => setDeleteId(n.id)}
            />
          ))}
        </div>
      )}

      <NoteModal open={modalOpen} onClose={() => setModalOpen(false)} note={editing} />

      <Modal open={random !== null} onClose={() => setRandom(null)} title="随机回顾" className="max-w-lg">
        {random && (
          <div>
            <p className="text-base font-semibold">{random.title || '无标题'}</p>
            <p className="mt-1 text-[11px] text-txt-muted">
              记于 {formatIsoDate(random.createdAt)} · 距今 {Math.max(1, Math.round((Date.now() - new Date(random.createdAt).getTime()) / 86400000))} 天
            </p>
            {random.content && (
              <div
                className="md-body mt-4 rounded-xl border border-line-2 bg-surface-1 p-4 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(random.content) }}
              />
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        message="便签会移入回收站,保留 30 天,随时可恢复。现在移入吗?"
        confirmText="移入回收站"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void softDelete(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
