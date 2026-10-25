/**
 * 页面间的轻量动作总线:
 * 命令面板/快捷键触发「新建任务/便签」时,目标页面可能还没挂载,
 * 所以把意图先存起来,页面挂载时来取。
 */

export type PendingAction = 'new-task' | 'new-note'

let pending: PendingAction | null = null

export function requestAction(action: PendingAction): void {
  pending = action
  // 页面已挂载的情况下也能立即收到
  window.dispatchEvent(new CustomEvent('nexus:action', { detail: action }))
}

export function consumeAction(action: PendingAction): boolean {
  if (pending === action) {
    pending = null
    return true
  }
  return false
}
