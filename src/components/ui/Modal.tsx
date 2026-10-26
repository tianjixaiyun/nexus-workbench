import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// 原生模态框负责焦点圈定、背景 inert、Esc 事件和关闭后的焦点恢复。
export function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    if (!dialog.open) dialog.showModal()
    // 自定义光标位于普通文档层，原生 dialog 顶层必须恢复系统光标。
    const cursorStyle = document.createElement('style')
    cursorStyle.textContent = `
      body.nexus-cursor dialog[open], body.nexus-cursor dialog[open] * { cursor: auto !important }
      body.nexus-cursor dialog[open] :is(button, a, [role="button"]) { cursor: pointer !important }
      body.nexus-cursor dialog[open] :is(input, textarea, [contenteditable="true"]) { cursor: text !important }
    `
    document.head.appendChild(cursorStyle)
    return () => {
      if (dialog.open) dialog.close()
      cursorStyle.remove()
    }
  }, [open])
  return ref
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useNativeDialog(open)
  const titleId = useId()
  if (!open) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none items-center justify-center bg-transparent p-4 text-txt-primary backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={cn('glass-card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto p-6 shadow-2xl', className)}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold tracking-wide">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-2 text-txt-muted transition-colors hover:bg-surface-2 hover:text-txt-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body,
  )
}
