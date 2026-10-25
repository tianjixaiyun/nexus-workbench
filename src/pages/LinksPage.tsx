import { useMemo, useState } from 'react'
import { FolderOpen, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import type { LinkItem } from '@/lib/data/types'
import { useLinkStore } from '@/stores/linkStore'
import { LinkCard } from '@/features/links/LinkCard'
import { LinkModal } from '@/features/links/LinkModal'

export default function LinksPage() {
  const { links, loaded, remove } = useLinkStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LinkItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, LinkItem[]>()
    for (const link of links) {
      const list = map.get(link.group) ?? []
      list.push(link)
      map.set(link.group, list)
    }
    return [...map.entries()]
  }, [links])

  const groupNames = useMemo(() => [...new Set(links.map((l) => l.group))], [links])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (link: LinkItem) => {
    setEditing(link)
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} />
          添加链接
        </Button>
      </div>

      {links.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="工具箱还是空的"
          hint="把常用的网站、系统、文档收进来,一键直达"
        >
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} />
            添加链接
          </Button>
        </EmptyState>
      ) : (
        groups.map(([group, items]) => (
          <section key={group}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-txt-secondary">
              <span className="neon-gradient-bg h-3.5 w-1 rounded-full" />
              {group}
              <span className="text-xs font-normal text-txt-muted">{items.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((link) => (
                <LinkCard key={link.id} link={link} onEdit={openEdit} onDelete={(l) => setDeleteId(l.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      <LinkModal open={modalOpen} onClose={() => setModalOpen(false)} link={editing} groups={groupNames} />

      <ConfirmDialog
        open={deleteId !== null}
        message="确定要从工具箱移除这个链接吗?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) void remove(deleteId)
          setDeleteId(null)
        }}
      />
    </div>
  )
}
