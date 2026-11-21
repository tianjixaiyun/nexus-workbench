import { create } from 'zustand'
import { uid } from '@/lib/utils'

/**
 * 全局通知(sonner 式,Emil Kowalski 的动效流派:进出都有目的,堆叠可点即消):
 * 任何模块 push 一条即可,Toaster 挂载在应用根部统一渲染。
 */

export type ToastKind = 'success' | 'error' | 'info'

/** 可选操作按钮(如「撤销」):点击后执行 run 并关闭通知 */
export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastItem {
  id: string
  kind: ToastKind
  title: string
  desc?: string
  action?: ToastAction
}

interface ToastState {
  toasts: ToastItem[]
  push: (kind: ToastKind, title: string, desc?: string, action?: ToastAction) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(kind, title, desc, action) {
    const id = uid()
    // 同屏最多保留 4 条,旧的自动让位
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, title, desc, action }] }))
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** 命令式快捷入口:toast.success('...') / toast.error('...') / toast.info('...') */
export const toast = {
  success: (title: string, desc?: string, action?: ToastAction) => useToastStore.getState().push('success', title, desc, action),
  error: (title: string, desc?: string, action?: ToastAction) => useToastStore.getState().push('error', title, desc, action),
  info: (title: string, desc?: string, action?: ToastAction) => useToastStore.getState().push('info', title, desc, action),
}
