import { useEffect, useLayoutEffect, useState, type FormEvent } from 'react'
import { BookmarkPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { activeCloudConnection } from '@/lib/config'
import { uid } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { addSavedTaskView, canonicalTaskViewQuery, parseSavedTaskViews, renameSavedTaskView, savedTaskViewsKey, serializeSavedTaskViews, type SavedTaskView, type SavedViewOwner, type TaskViewMode } from './savedViews'

interface Props {
  owner: SavedViewOwner | null
  params: URLSearchParams
  view: TaskViewMode
  onRestore: (params: URLSearchParams) => void
}

export function TaskSavedViews({ owner, params, view, onRestore }: Props) {
  const key = owner ? savedTaskViewsKey(owner) : null
  const [views, setViews] = useState<SavedTaskView[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [editor, setEditor] = useState<{ kind: 'new' | 'rename'; id?: string } | null>(null)
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  let currentQuery = ''
  try { currentQuery = canonicalTaskViewQuery(params, view) } catch { /* A long search can still filter tasks without becoming a view. */ }
  const selected = views.find(item => item.id === selectedId && item.query === currentQuery)

  useLayoutEffect(() => {
    setSelectedId('')
    setEditor(null)
    setDeleteId(null)
    setName('')
    setError('')
  }, [key])

  useEffect(() => {
    const load = () => {
      setError('')
      try { setViews(key ? parseSavedTaskViews(localStorage.getItem(key)) : []) }
      catch (cause) { setViews([]); setError(cause instanceof Error ? cause.message : '无法读取保存视图，当前筛选未改变。') }
    }
    load()
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) load() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const readCurrent = () => {
    if (!key || !owner) throw new Error('请等待账号就绪后再管理保存视图。')
    if (owner.mode === 'cloud') {
      const auth = useAuthStore.getState()
      if (!auth.ready || auth.user?.id !== owner.userId || activeCloudConnection?.url !== owner.url) throw new Error('账号或云项目已变化，请重新打开任务中心。')
    }
    return parseSavedTaskViews(localStorage.getItem(key))
  }
  const commit = (change: (current: SavedTaskView[]) => SavedTaskView[]): boolean => {
    setError('')
    try {
      const next = change(readCurrent())
      localStorage.setItem(key!, serializeSavedTaskViews(next))
      setViews(next)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存视图失败，当前筛选未改变。')
      return false
    }
  }
  const restore = (id: string) => {
    if (!id) { setSelectedId(''); return }
    setError('')
    try {
      const latest = readCurrent()
      const target = latest.find(item => item.id === id)
      if (!target) throw new Error('视图已在其他标签页删除，请重新选择。')
      setViews(latest)
      setSelectedId(id)
      onRestore(new URLSearchParams(target.query))
    } catch (cause) { setError(cause instanceof Error ? cause.message : '无法恢复视图，当前筛选未改变。') }
  }
  const submitName = (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const id = editor.id ?? uid()
    if (commit(current => editor.kind === 'rename' ? renameSavedTaskView(current, id, name) : addSavedTaskView(current, name, params, view, id))) {
      setSelectedId(id)
      setEditor(null)
    }
  }

  return (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Select aria-label="选择本机保存视图" value={selected?.id ?? ''} disabled={!owner} onChange={event => restore(event.target.value)} className="h-8 w-40 min-w-0 text-xs">
          <option value="">本机保存视图{views.length ? ` · ${views.length}` : ''}</option>
          {views.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Button size="sm" variant="ghost" disabled={!owner} onClick={() => { setName(''); setError(''); setEditor({ kind: 'new' }) }}><BookmarkPlus size={14} />保存视图</Button>
        {selected && <details className="relative">
          <summary aria-label={`管理视图：${selected.name}`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-txt-secondary hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"><MoreHorizontal size={17} /></summary>
          <div className="absolute top-full right-0 z-20 mt-1 min-w-36 rounded-xl border border-line-2 bg-ink-900 p-1 shadow-xl">
            <Button size="sm" className="w-full" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setName(selected.name); setError(''); setEditor({ kind: 'rename', id: selected.id }) }}><Pencil size={13} />重命名</Button>
            <Button size="sm" variant="danger" className="w-full" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setError(''); setDeleteId(selected.id) }}><Trash2 size={13} />删除视图</Button>
          </div>
        </details>}
      </div>
      {error && !editor && !deleteId && <p role="alert" className="text-xs text-danger">{error}</p>}
      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor?.kind === 'rename' ? '重命名视图' : '保存当前任务视图'} className="max-w-sm">
        <form onSubmit={submitName} className="flex flex-col gap-4">
          <label className="text-sm text-txt-secondary">视图名称<Input autoFocus value={name} maxLength={40} onChange={event => setName(event.target.value)} className="mt-2" placeholder="例如：工作 · 高优先级" /></label>
          <p className="text-xs leading-relaxed text-txt-muted">保存当前筛选和显示方式，最多 12 项。视图仅属于此设备的当前账号，不参与云同步。</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditor(null)}>取消</Button><Button type="submit" variant="primary" disabled={!name.trim()}>保存</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={deleteId !== null} title="删除保存视图" message={error || '仅删除此筛选视图，任务内容不会被删除。'} confirmText="删除视图" onCancel={() => setDeleteId(null)} onConfirm={() => { if (commit(current => current.filter(item => item.id !== deleteId))) { setDeleteId(null); setSelectedId('') } }} />
    </>
  )
}
