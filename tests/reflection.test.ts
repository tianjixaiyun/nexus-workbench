import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Daily } from '../src/lib/data/types'

const memory = vi.hoisted(() => ({ records: [] as Daily[] }))
vi.mock('@/lib/data', () => ({
  dataAdapter: {
    dailies: {
      list: async () => memory.records,
      create: async (input: Partial<Daily>) => {
        const record = { id: 'new', createdAt: '', updatedAt: '', ...input } as Daily
        memory.records.push(record)
        return record
      },
      update: async (id: string, patch: Partial<Daily>) => {
        const index = memory.records.findIndex((record) => record.id === id)
        memory.records[index] = { ...memory.records[index], ...patch }
        return memory.records[index]
      },
    },
  },
}))
import { useDailyStore } from '../src/stores/dailyStore'

describe('daily reflection persistence', () => {
  beforeEach(async () => {
    memory.records = [{ id: 'day', date: '2026-10-26', mood: 3, note: '今天学会了一件事', createdAt: '', updatedAt: '' }]
    useDailyStore.getState().reset()
    await useDailyStore.getState().fetch()
  })

  it('changing only the mood keeps the existing reflection in storage and state', async () => {
    await useDailyStore.getState().upsert('2026-10-26', 5)
    expect(memory.records[0]).toMatchObject({ mood: 5, note: '今天学会了一件事' })
    expect(useDailyStore.getState().dailies[0].note).toBe('今天学会了一件事')
  })

  it('an explicit empty note clears the reflection', async () => {
    await useDailyStore.getState().upsert('2026-10-26', 4, '')
    expect(memory.records[0].note).toBe('')
  })

  it('a new mood-only day starts with an empty reflection', async () => {
    await useDailyStore.getState().upsert('2026-10-25', 4)
    expect(useDailyStore.getState().dailies.find((day) => day.date === '2026-10-25')).toMatchObject({ mood: 4, note: '' })
  })
})

describe('reflection date and fact summaries', () => {
  it('uses this Monday only on Monday and all seven days on Sunday, including a year boundary', async () => {
    const { weekDateKeys } = await import('../src/lib/reflection')
    expect(weekDateKeys(new Date(2026, 9, 26))).toEqual(['2026-10-26'])
    expect(weekDateKeys(new Date(2026, 10, 1))).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01',
    ])
    expect(weekDateKeys(new Date(2027, 0, 1))).toEqual(['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01'])
  })

  it('applies the same current-week boundary to tasks, habit checkins, minutes and moods', async () => {
    const { summarizeWeek } = await import('../src/lib/reflection')
    const stats = summarizeWeek({
      tasks: [
        { title: '本周', status: 'done', completedAt: new Date(2026, 9, 26, 9).toISOString(), deletedAt: null },
        { title: '上周', status: 'done', completedAt: new Date(2026, 9, 25, 9).toISOString(), deletedAt: null },
        { title: '回收站', status: 'done', completedAt: new Date(2026, 9, 26, 9).toISOString(), deletedAt: '2026-10-26' },
        { title: '重新打开', status: 'todo', completedAt: new Date(2026, 9, 26, 9).toISOString(), deletedAt: null },
      ],
      habits: [{ name: '阅读', dates: ['2026-10-25', '2026-10-26', '2026-10-26'] }],
      dailies: [{ date: '2026-10-25', mood: 1 }, { date: '2026-10-26', mood: 5 }],
      focus: [{ key: '2026-10-25', minutes: 25 }, { key: '2026-10-26', minutes: 40 }],
    }, new Date(2026, 9, 26))
    expect(stats).toEqual({ tasksDone: 1, habitCheckins: 1, focusMinutes: 40, moodAvg: 5, days: 1 })
  })

  it('rejects future and impossible dates for the reflection picker', async () => {
    const { isReflectionDate } = await import('../src/lib/reflection')
    const today = new Date(2026, 9, 26)
    expect(isReflectionDate('2026-10-26', today)).toBe(true)
    expect(isReflectionDate('2026-10-25', today)).toBe(true)
    expect(isReflectionDate('2026-10-27', today)).toBe(false)
    expect(isReflectionDate('2026-02-30', today)).toBe(false)
    expect(isReflectionDate('', today)).toBe(false)
  })

  it('drafts only observed facts for the selected day without inventing achievements', async () => {
    const { buildReflectionDraft } = await import('../src/lib/reflection')
    const draft = buildReflectionDraft({
      date: '2026-10-26',
      tasks: [
        { title: '读完第一章', status: 'done', completedAt: new Date(2026, 9, 26, 8).toISOString(), deletedAt: null },
        { title: '明天才完成', status: 'done', completedAt: new Date(2026, 9, 27, 8).toISOString(), deletedAt: null },
      ],
      habits: [{ name: '阅读', dates: ['2026-10-26'] }],
      focusMinutes: 40,
    })
    expect(draft).toContain('完成 1 个任务：读完第一章')
    expect(draft).toContain('习惯打卡 1 次：阅读')
    expect(draft).toContain('专注 40 分钟')
    expect(draft).not.toContain('明天才完成')
  })
})
