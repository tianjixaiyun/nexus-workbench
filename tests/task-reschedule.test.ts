import { describe, expect, it, vi } from 'vitest'
import { nextMonday, rescheduleSequentially } from '../src/features/tasks/taskReschedule'

describe('任务改期', () => {
  it('下周一跨月跨年，周一也指向下一周', () => {
    expect(nextMonday('2026-12-31')).toBe('2027-01-04')
    expect(nextMonday('2026-10-26')).toBe('2026-11-02')
  })

  it('逐项保存并在失败时停下，返回已保存和待处理项', async () => {
    const save = vi.fn(async (id: string) => { if (id === 'b') throw new Error('offline') })
    const result = await rescheduleSequentially(['a', 'b', 'c'], save)
    expect(save.mock.calls.map(call => call[0])).toEqual(['a', 'b'])
    expect(result).toEqual({ completed: ['a'], remaining: ['b', 'c'] })
  })

  it('全部成功时没有待处理项', async () => {
    expect(await rescheduleSequentially(['a', 'b'], async () => {})).toEqual({ completed: ['a', 'b'], remaining: [] })
  })
})
