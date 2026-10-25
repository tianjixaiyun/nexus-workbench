import { useEffect, useState } from 'react'
import { Loader2, RotateCcw, StickyNote, Trash2, ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatIsoDate } from '@/lib/utils'
import { sortNotes, trashedNotes, useNoteStore } from '@/stores/noteStore'
import { trashedTasks, TRASH_RETENTION_DAYS, useTaskStore } from '@/stores/taskStore'
import { PRIORITY_META } from '@/features/tasks/taskMeta'

export default function TrashPage() {
  const { tasks, loaded: tasksLoaded, restore: restoreTask, remove: removeTask, emptyTrash: emptyTasks, purgeExpired: purgeTasks } = useTaskStore()
  const { notes, loaded: notesLoaded, restore: restoreNote, remove: removeNote, emptyTrash: emptyNotes, purgeExpired: purgeNotes } = useNoteStore()
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const trashedT = trashedTasks(tasks)
  const trashedN = trashedNotes(notes)

  useEffect(() => {
    // 超过保留期的自动清理
    void purgeTasks()
    void purgeNotes()
  }, [purgeTasks, purgeNotes])

  if (!tasksLoaded || !notesLoaded) {
    return (
      <div className="flex items-center justify-center gap-3 py-32 text-txt-secondary">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  if (trashedT.length === 0 && trashedN.length === 0) {
    return (
      <EmptyState
        icon={Trash2}
        title="回收站是空的"
        hint={`删除的任务和便签会在这里保留 ${TRASH_RETENTION_DAYS} 天,之后自动清除`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-txt-muted">回收站中的内容保留 {TRASH_RETENTION_DAYS} 天后自动永久删除</p>
        <Button
          variant="danger"
          className="border border-rose-500/30"
          onClick={() => setConfirmEmpty(true)}
        >
          <Trash2 size={14} />
          清空回收站
        </Button>
      </div>

      {trashedT.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-txt-secondary">
            <ListChecks size={15} />
            任务 ({trashedT.length})
          </h2>
          {trashedT.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.title}</p>
                <p className="mt-0.5 text-xs text-txt-muted">删除于 {formatIsoDate(t.deletedAt!)}</p>
              </div>
              <Badge tone={PRIORITY_META[t.priority].tone}>{PRIORITY_META[t.priority].label}</Badge>
              <Button size="sm" variant="outline" onClick={() => void restoreTask(t.id)}>
                <RotateCcw size={13} />
                恢复
              </Button>
              <Button size="sm" variant="danger" onClick={() => void removeTask(t.id)}>
                彻底删除
              </Button>
            </Card>
          ))}
        </section>
      )}

      {trashedN.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-txt-secondary">
            <StickyNote size={15} />
            便签 ({trashedN.length})
          </h2>
          {sortNotes(trashedN).map((n) => (
            <Card key={n.id} className="flex items-center gap-3 !py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{n.title || '无标题'}</p>
                <p className="mt-0.5 truncate text-xs text-txt-muted">
                  {n.content.slice(0, 40) || '空便签'} · 删除于 {formatIsoDate(n.deletedAt!)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void restoreNote(n.id)}>
                <RotateCcw size={13} />
                恢复
              </Button>
              <Button size="sm" variant="danger" onClick={() => void removeNote(n.id)}>
                彻底删除
              </Button>
            </Card>
          ))}
        </section>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        title="清空回收站"
        message={`将永久删除 ${trashedT.length + trashedN.length} 条内容,无法恢复。确定吗?`}
        confirmText="全部删除"
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={() => {
          void emptyTasks()
          void emptyNotes()
          setConfirmEmpty(false)
        }}
      />
    </div>
  )
}
