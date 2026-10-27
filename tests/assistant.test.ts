import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/data', () => ({ dataAdapter: {} }))
import { askAssistant, buildAssistantSnapshot } from '../src/lib/assistant'
import { useTaskStore } from '../src/stores/taskStore'
import { useNoteStore } from '../src/stores/noteStore'
import { useHabitStore } from '../src/stores/habitStore'
import { useDailyStore } from '../src/stores/dailyStore'
import type { Task } from '../src/lib/data/types'

const task = (id: string, patch: Partial<Task> = {}): Task => ({ id, title: id, description: '', status: 'todo', priority: 'medium', dueDate: null, completedAt: null, subtasks: [], tags: [], deletedAt: null, recurrence: 'none', focusMinutes: 0, sortOrder: 0, createdAt: '2026-10-28T00:00:00Z', updatedAt: '', ...patch })
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 28, 10))
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) })
  useTaskStore.setState({ loaded: true, tasks: [task('late', {title:'延期报告',dueDate:'2026-10-27'}), task('today', {title:'React方案',dueDate:'2026-10-28',tags:['学习']}), task('future',{dueDate:'2026-11-20'}), task('done',{status:'done',completedAt:'2026-10-27T10:00:00Z'}), task('trash',{title:'React已删除',deletedAt:'2026-10-28'})] })
  useNoteStore.setState({ loaded: true, notes: [] })
  useHabitStore.setState({ loaded: true, habits: [] })
  useDailyStore.setState({ loaded: true, dailies: [] })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('本地助手输出事实而非提示词要求', () => {
  it('概览输出真实计数和日期，不把要求当答案', () => {
    const result = askAssistant('总结现状')
    expect(result.answer).toContain('未开始 3')
    expect(result.answer).toContain('逾期 1')
    expect(result.answer).not.toContain('用不超过 3 句话')
    expect(result.prompt).toContain('2026-10-28')
  })
  it('具体意图优先于宽泛的“怎么样”', () => {
    expect(askAssistant('我的专注怎么样').intent).toBe('focus')
    expect(askAssistant('我的习惯怎么样').intent).toBe('habits')
  })
  it('关键词查询真正返回命中及精确入口，不含回收站', () => {
    const result = askAssistant('找 React')
    expect(result.answer).toContain('React方案')
    expect(result.answer).not.toContain('React已删除')
    expect(result.sources?.[0]?.href).toContain('task=today')
  })
  it('空查询不会泄露全部记录，未知问题明确回到帮助', () => {
    expect(askAssistant('找').answer).toContain('关键词')
    expect(askAssistant('找').answer).not.toContain('React方案')
    expect(askAssistant('明天股价涨多少').intent).toBe('help')
  })
  it('今日规划有来源，优先处理逾期；远期任务不冒充未来7天', () => {
    expect(askAssistant('今天先做什么').sources?.[0]?.href).toContain('task=late')
    expect(askAssistant('最近截止').answer).not.toContain('2026-11-20')
  })
  it('数据尚未加载时不把零当结论', () => {
    useTaskStore.setState({ loaded:false })
    expect(askAssistant('总结现状').answer).toContain('尚未加载')
  })
  it('已归档习惯不参与建议，未来完成记录不算本周', () => {
    useHabitStore.setState({ habits:[{id:'archived',name:'已归档',icon:'',dates:['2026-10-28'],color:'cyan',archived:true,createdAt:''}] })
    expect(askAssistant('习惯').answer).toContain('没有正在使用的习惯')
    useTaskStore.setState({tasks:[task('future-done',{status:'done',completedAt:'2026-12-31T00:00:00Z'})]})
    expect(askAssistant('总结现状').answer).toContain('本周完成 0')
  })
  it('归档不抹去本周已经发生的打卡，周统计与数据看板一致', () => {
    useHabitStore.setState({ habits:[{id:'archived',name:'已归档',icon:'',dates:['2026-10-27'],color:'cyan',archived:true,createdAt:''}] })
    expect(buildAssistantSnapshot().habits).toHaveLength(0)
    expect(buildAssistantSnapshot().week.habitCheckins).toBe(1)
  })
})
