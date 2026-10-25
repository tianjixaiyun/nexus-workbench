import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { LinkItem } from '@/lib/data/types'
import { useLinkStore } from '@/stores/linkStore'

interface LinkModalProps {
  open: boolean
  onClose: () => void
  link?: LinkItem | null
  /** 该分组下所有已有分组名,供 datalist 提示 */
  groups: string[]
}

/** 补全协议头,避免存进去打不开 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function LinkModal({ open, onClose, link, groups }: LinkModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [group, setGroup] = useState('')
  const { add, update } = useLinkStore()

  useEffect(() => {
    if (!open) return
    if (link) {
      setName(link.name)
      setUrl(link.url)
      setGroup(link.group)
    } else {
      setName('')
      setUrl('')
      setGroup('')
    }
  }, [open, link])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    const payload = {
      name: name.trim(),
      url: normalizeUrl(url),
      group: group.trim() || '未分组',
    }
    if (link) await update(link.id, payload)
    else await add(payload)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={link ? '编辑链接' : '添加链接'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">名称 *</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如:公司邮箱"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">网址 *</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…(可不带协议头)"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">分组</label>
          <Input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="例如:工作 / 常用 / 学习"
            list="link-groups"
          />
          <datalist id="link-groups">
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || !url.trim()}>
            {link ? '保存' : '添加'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
