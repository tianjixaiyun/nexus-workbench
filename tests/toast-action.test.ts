import { beforeEach, describe, expect, it } from 'vitest'
import { toast, useToastStore } from '../src/stores/toastStore'

describe('toast action(撤销按钮)', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('success 携带 action 并能执行', () => {
    let undoCalls = 0
    toast.success('已移入回收站', '任务标题', { label: '撤销', run: () => { undoCalls++ } })
    const list = useToastStore.getState().toasts
    expect(list).toHaveLength(1)
    expect(list[0].action?.label).toBe('撤销')
    list[0].action?.run()
    expect(undoCalls).toBe(1)
  })

  it('不带 action 的旧调用保持兼容', () => {
    toast.error('保存失败', '网络原因')
    const list = useToastStore.getState().toasts
    expect(list).toHaveLength(1)
    expect(list[0].kind).toBe('error')
    expect(list[0].action).toBeUndefined()
  })

  it('dismiss 移除对应通知', () => {
    toast.info('提示一')
    toast.info('提示二')
    const first = useToastStore.getState().toasts[0]
    useToastStore.getState().dismiss(first.id)
    const list = useToastStore.getState().toasts
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('提示二')
  })
})
