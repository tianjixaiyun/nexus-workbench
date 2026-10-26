import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Building2, CalendarClock, Mail, Pencil, Phone, Plus, Search, Trash2, UserCheck } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useContactStore } from '@/stores/contactStore'
import { HoldToConfirmButton } from '@/components/ui/HoldToConfirmButton'
import type { Contact } from '@/lib/data/types'
import { cn, todayStr } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

/** 跟进状态:逾期 / 今日 / N 天内 / 未安排 */
function followUpMeta(c: Contact): { label: string; cls: string } | null {
  if (!c.nextFollowUp) return null
  const today = todayStr()
  if (c.nextFollowUp < today) return { label: '跟进已逾期', cls: 'bg-rose-500/15 text-danger' }
  if (c.nextFollowUp === today) return { label: '今日跟进', cls: 'bg-warn/15 text-warn' }
  const days = Math.round((new Date(c.nextFollowUp).getTime() - new Date(today).getTime()) / 86400000)
  if (days <= 3) return { label: `${days} 天后跟进`, cls: 'bg-accent-soft text-accent' }
  return { label: `${days} 天后跟进`, cls: 'bg-surface-2 text-txt-muted' }
}

const GRADIENTS = [
  'from-cyan-500/70 to-blue-600/70',
  'from-violet-500/70 to-fuchsia-600/70',
  'from-emerald-500/70 to-teal-600/70',
  'from-amber-500/70 to-orange-600/70',
  'from-rose-500/70 to-pink-600/70',
]

function ContactModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Contact | null }) {
  const { add, update } = useContactStore()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [tags, setTags] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [lastContactAt, setLastContactAt] = useState('')
  const [note, setNote] = useState('')

  // 打开时同步编辑目标
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setCompany(editing?.company ?? '')
    setRole(editing?.role ?? '')
    setTags(editing?.tags.join(' ') ?? '')
    setEmail(editing?.email ?? '')
    setPhone(editing?.phone ?? '')
    setNextFollowUp(editing?.nextFollowUp ?? '')
    setLastContactAt(editing?.lastContactAt ?? '')
    setNote(editing?.note ?? '')
  }, [open, editing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      company: company.trim(),
      role: role.trim(),
      tags: tags.split(/[\s,，]+/).filter(Boolean),
      email: email.trim(),
      phone: phone.trim(),
      note: note.trim(),
      lastContactAt: lastContactAt || null,
      nextFollowUp: nextFollowUp || null,
    }
    if (editing) await update(editing.id, payload)
    else await add(payload)
    toast.success(editing ? '联系人已更新' : '联系人已添加', name.trim())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑联系人' : '添加联系人'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">姓名 *</label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:张三" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">公司/组织</label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="选填" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">职位/身份</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="选填" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">邮箱</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="选填" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">电话</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="选填" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">下次跟进</label>
            <Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-txt-secondary">最近联系</label>
            <Input type="date" value={lastContactAt} onChange={(e) => setLastContactAt(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">标签(空格分隔)</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例如:客户 设计师 重要" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-txt-secondary">备注</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="怎么认识的、聊过什么…"
            className="w-full rounded-xl border border-line-2 bg-input-bg px-3 py-2 text-sm outline-none transition-colors placeholder:text-txt-muted focus:border-accent"
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            {editing ? '保存' : '添加'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function ContactsView() {
  const { contacts, remove, update } = useContactStore()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter((c) =>
      [c.name, c.company, c.role, c.tags.join(' '), c.note, c.email].join(' ').toLowerCase().includes(q),
    )
  }, [contacts, query])

  const today = todayStr()
  const dueCount = contacts.filter((c) => c.nextFollowUp && c.nextFollowUp <= today).length

  const markContacted = async (c: Contact) => {
    await update(c.id, { lastContactAt: today, nextFollowUp: null })
    toast.success('已记录联系', `${c.name} · ${today}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部:搜索 + 统计 + 添加 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-txt-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`搜索 ${contacts.length} 位联系人…(姓名/公司/标签/备注)`}
            className="w-full rounded-xl border border-line-2 bg-input-bg py-2 pr-3 pl-8 text-sm outline-none transition-colors placeholder:text-txt-muted focus:border-accent"
          />
        </div>
        {dueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-3 py-1.5 text-xs text-warn">
            <CalendarClock size={13} />
            {dueCount} 位待跟进
          </span>
        )}
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus size={15} />
          添加联系人
        </Button>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={query ? '没有匹配的联系人' : '人脉还是空的'}
          hint={query ? '换个关键词试试' : '把认识的人记下来:客户、导师、朋友——安排跟进,重要关系不再断线'}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const meta = followUpMeta(c)
            const hash = [...c.name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0)
            const gradient = GRADIENTS[hash % GRADIENTS.length]
            return (
              <Card key={c.id} spotlight className="glass-card-hover flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-bold text-white',
                      gradient,
                    )}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      {meta && <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px]', meta.cls)}>{meta.label}</span>}
                    </div>
                    {(c.company || c.role) && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-txt-muted">
                        <Building2 size={11} className="shrink-0" />
                        {[c.role, c.company].filter(Boolean).join(' · ') || '—'}
                      </p>
                    )}
                  </div>
                </div>

                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-txt-secondary">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {c.note && <p className="line-clamp-2 text-xs leading-relaxed text-txt-muted">{c.note}</p>}

                <div className="mt-auto flex items-center gap-2 border-t border-line-1 pt-2.5">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex min-w-0 items-center gap-1 text-[11px] text-txt-muted transition-colors hover:text-accent"
                      title={c.email}
                    >
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[11px] text-txt-muted transition-colors hover:text-accent" title={c.phone}>
                      <Phone size={11} />
                      {c.phone}
                    </a>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void markContacted(c)}
                      className="cursor-pointer rounded-md p-1.5 text-txt-muted transition-colors hover:bg-accent-soft hover:text-accent"
                      title="记一笔:今天联系过了"
                    >
                      <UserCheck size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(c)
                        setModalOpen(true)
                      }}
                      className="cursor-pointer rounded-md p-1.5 text-txt-muted transition-colors hover:bg-surface-3 hover:text-txt-primary"
                      title="编辑"
                    >
                      <Pencil size={13} />
                    </button>
                    {/* 按住确认(Rauno 式):按住删除键充满进度条才执行,松手即取消 */}
                    <HoldToConfirmButton
                      holdMs={750}
                      onConfirm={() => {
                        void remove(c.id)
                        toast.info('联系人已删除', c.name)
                      }}
                      className="rounded-md p-1.5 text-txt-muted transition-colors hover:bg-rose-500/15 hover:text-danger"
                      title="按住以删除"
                      aria-label="按住以删除联系人"
                    >
                      <Trash2 size={13} />
                    </HoldToConfirmButton>
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  )
}
