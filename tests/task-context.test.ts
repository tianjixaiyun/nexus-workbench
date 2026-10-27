import { beforeEach, describe, expect, it, vi } from 'vitest'
const adapter = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/data', () => ({ dataAdapter: { tasks: adapter } }))
import { useTaskStore } from '../src/stores/taskStore'
import type { Task } from '../src/lib/data/types'
import { DEFAULT_FILTERS, filterTasks, readFilters, readTaskView, shiftDay, taskScopeCounts, patchTaskFilters, resolveTaskTarget, taskInitialTags, kanbanTargetIndex } from '../src/features/tasks/taskFilters'

const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id, title: id, description: '', status: 'todo', priority: 'medium', dueDate: null,
  completedAt: null, subtasks: [], tags: [], deletedAt: null, recurrence: 'none', focusMinutes: 0,
  sortOrder: 0, createdAt: '2026-10-27T00:00:00Z', updatedAt: '', ...patch,
})
const tasks = [
  task('inbox'), task('overdue', { dueDate: '2026-12-30' }),
  task('today', { dueDate: '2026-12-31', tags: ['学习/React'] }),
  task('next', { dueDate: '2027-01-06' }), task('outside', { dueDate: '2027-01-07' }),
  task('done', { status: 'done', dueDate: '2026-12-31' }), task('trash', { deletedAt: '2026-12-31T00:00:00Z' }),
]
const ids = (scope: typeof DEFAULT_FILTERS.scope) => filterTasks(tasks, { ...DEFAULT_FILTERS, scope }, '2026-12-31').map(item => item.id)

describe('任务行动视图', () => {
  it('今日包含逾期，未来七天含今天并排除已完成和回收站', () => {
    expect(ids('today')).toEqual(['overdue', 'today'])
    expect(ids('inbox')).toEqual(['inbox'])
    expect(ids('overdue')).toEqual(['overdue'])
    expect(ids('upcoming')).toEqual(['today', 'next'])
    expect(ids('done')).toEqual(['done'])
    expect(taskScopeCounts(tasks, '2026-12-31')).toEqual({ all: 6, inbox: 1, today: 2, upcoming: 2, overdue: 1, done: 1 })
  })

  it('组合描述标签全文、精确标签、状态优先级且不改变源数组', () => {
    const source = [task('first', { title: '需求整理', description: 'Write README', tags: ['AI & React'], status: 'doing', priority: 'high' }), task('second', { tags: ['AI'] })]
    const before = source.slice()
    expect(filterTasks(source, { ...DEFAULT_FILTERS, search: 'readme', tag: 'AI & React', status: 'doing', priority: 'high' }, '2026-12-31').map(item => item.id)).toEqual(['first'])
    expect(filterTasks(source, { ...DEFAULT_FILTERS, search: 'react' }, '2026-12-31').map(item => item.id)).toEqual(['first'])
    expect(filterTasks(source, { ...DEFAULT_FILTERS, tag: 'AI' }, '2026-12-31').map(item => item.id)).toEqual(['second'])
    expect(source).toEqual(before)
  })

  it('支持智能、日期、创建时间、标题排序，未排期和已完成靠后', () => {
    const source = [task('low', { priority: 'low', dueDate: '2026-12-29' }), task('high', { title: 'Alpha', priority: 'high', dueDate: '2026-12-31' }), task('new', { title: 'Beta', createdAt: '2026-12-31T00:00:00Z' }), task('done', { status: 'done' })]
    expect(filterTasks(source, DEFAULT_FILTERS, '2026-12-31').map(item => item.id)).toEqual(['high', 'new', 'low', 'done'])
    expect(filterTasks(source, { ...DEFAULT_FILTERS, sort: 'due' }, '2026-12-31').map(item => item.id)).toEqual(['low', 'high', 'new', 'done'])
    expect(filterTasks(source, { ...DEFAULT_FILTERS, sort: 'newest' }, '2026-12-31')[0].id).toBe('new')
    expect(filterTasks(source, { ...DEFAULT_FILTERS, sort: 'title' }, '2026-12-31')[0].id).toBe('high')
  })

  it('旧记录缺少标签时仍可搜索，未知URL枚举回到安全默认', () => {
    expect(filterTasks([task('old', { tags: undefined as unknown as string[] })], { ...DEFAULT_FILTERS, search: 'old' }, '2026-12-31')).toHaveLength(1)
    expect(readFilters(new URLSearchParams('scope=evil&priority=urgent&status=oops&sort=bogus'))).toEqual(DEFAULT_FILTERS)
    expect(readFilters(new URLSearchParams('scope=today&tag=AI+%26+React&q=readme'))).toMatchObject({ scope: 'today', tag: 'AI & React', search: 'readme' })
  })

  it('过滤链接默认打开列表，显式切换视图保留URL指定模式', () => {
    expect(readTaskView(new URLSearchParams('scope=today'), 'calendar')).toBe('list')
    expect(readTaskView(new URLSearchParams('view=calendar&tag=AI'), 'list')).toBe('calendar')
    expect(readTaskView(new URLSearchParams('view=kanban&scope=overdue'), 'calendar')).toBe('kanban')
    expect(readTaskView(new URLSearchParams(), 'kanban')).toBe('kanban')
  })

  it('自然日运算跨年和闰日保持正确边界', () => {
    expect(shiftDay('2026-12-31', 6)).toBe('2027-01-06')
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('任务链接上下文', () => {
  it('变更组合筛选保留当前视图、对象和其他查询参数', () => {
    const params = new URLSearchParams('scope=today&view=calendar&task=chosen&source=goal')
    const updated = patchTaskFilters(params, { tag: 'AI & React', search: 'README', scope: 'all' })
    expect(updated.get('view')).toBe('calendar')
    expect(updated.get('task')).toBe('chosen')
    expect(updated.get('source')).toBe('goal')
    expect(updated.get('tag')).toBe('AI & React')
    expect(updated.get('q')).toBe('README')
    expect(updated.has('scope')).toBe(false)
    expect(params.get('scope')).toBe('today')
  })

  it('精确对象链接先等待加载，再按ID区分同名任务并拒绝回收站记录', () => {
    const source = [task('one', { title: '同名任务' }), task('two', { title: '同名任务' }), task('deleted', { deletedAt: '2026-10-27' })]
    expect(resolveTaskTarget('two', source, false)).toEqual({ kind: 'loading' })
    expect(resolveTaskTarget('two', source, true)).toEqual({ kind: 'edit', task: source[1] })
    expect(resolveTaskTarget('deleted', source, true)).toEqual({ kind: 'missing' })
    expect(resolveTaskTarget('unknown', source, true)).toEqual({ kind: 'missing' })
    expect(resolveTaskTarget(null, source, true)).toEqual({ kind: 'none' })
  })

  it('目标标签只预填新任务，编辑已有任务保留原标签并复制数组', () => {
    const existing = task('edit', { tags: ['已有标签'] })
    expect(taskInitialTags(null, '目标标签')).toEqual(['目标标签'])
    const tags = taskInitialTags(existing, '目标标签')
    expect(tags).toEqual(['已有标签'])
    tags.push('表单修改')
    expect(existing.tags).toEqual(['已有标签'])
    expect(taskInitialTags(null)).toEqual([])
  })
})

describe('筛选看板的拖拽位置', () => {
  it('以完整列中的目标卡片位置移动，隐藏任务不会造成下移失效', () => {
    const source = [task('hidden', { sortOrder: 100 }), task('B', { sortOrder: 200 }), task('C', { sortOrder: 300 }), task('other', { status: 'doing', sortOrder: 100 })]
    expect(kanbanTargetIndex(source, 'B', 'todo', 'C')).toBe(2)
    expect(kanbanTargetIndex(source, 'C', 'todo', 'B')).toBe(1)
    expect(kanbanTargetIndex(source, 'other', 'todo', 'C')).toBe(2)
    expect(kanbanTargetIndex(source, 'B', 'todo', null)).toBe(2)
  })
})

describe('看板移动与真实任务状态', () => {
  let records: Map<string, Task>
  const load = (source: Task[]) => {
    records = new Map(source.map(item => [item.id, { ...item }]))
    useTaskStore.setState({ tasks: source, loaded: true })
  }
  beforeEach(() => {
    records = new Map()
    useTaskStore.setState({ tasks: [], loaded: true })
    adapter.update.mockReset().mockImplementation(async (id: string, patch: Partial<Task>) => {
      const existing = records.get(id)
      if (!existing) throw new Error('记录不存在')
      const result = { ...existing, ...patch }
      records.set(id, result)
      return result
    })
    adapter.create.mockReset().mockImplementation(async (input: Partial<Task>) => {
      const result = task(`spawn-${records.size}`, input)
      records.set(result.id, result)
      return result
    })
  })

  it('跨列后同ID仅一条，保留其他未展示任务与回收站原记录', async () => {
    const hidden = task('hidden', { sortOrder: 100 })
    const deleted = task('deleted', { status: 'doing', deletedAt: '2026-10-27', sortOrder: 17 })
    load([task('moving', { sortOrder: 200 }), hidden, deleted, task('target', { status: 'doing', sortOrder: 100 })])
    await useTaskStore.getState().move('moving', 'doing', 1)
    const saved = useTaskStore.getState().tasks
    expect(saved.filter(item => item.id === 'moving')).toHaveLength(1)
    expect(saved.find(item => item.id === 'moving')?.status).toBe('doing')
    expect(saved.find(item => item.id === 'hidden')).toEqual(hidden)
    expect(saved.find(item => item.id === 'deleted')).toEqual(deleted)
    expect(records.get('deleted')).toEqual(deleted)
    expect(new Set(saved.map(item => item.id)).size).toBe(4)
  })

  it('拖到已完成复用完成语义，保留完成时间并且仅生成一个下次重复任务', async () => {
    load([task('repeat', { recurrence: 'daily', dueDate: '2026-12-31', tags: ['目标'], subtasks: [{ id: 'step', title: '一步', done: true }] })])
    await useTaskStore.getState().move('repeat', 'done', 0)
    await useTaskStore.getState().move('repeat', 'done', 0)
    const saved = useTaskStore.getState().tasks
    expect(saved.find(item => item.id === 'repeat')).toMatchObject({ status: 'done', subtasks: [{ id: 'step', title: '一步', done: true }] })
    expect(saved.find(item => item.id === 'repeat')?.completedAt).toMatch(/^\d{4}-/)
    expect(records.get('repeat')?.completedAt).toBe(saved.find(item => item.id === 'repeat')?.completedAt)
    expect(saved.filter(item => item.dueDate === '2027-01-01')).toHaveLength(1)
    expect(saved.find(item => item.dueDate === '2027-01-01')).toMatchObject({ status: 'todo', tags: ['目标'], subtasks: [{ id: 'step', title: '一步', done: false }] })
  })

  it('第一次持久化失败时不把未保存的移动显示成成功', async () => {
    const original = task('offline')
    load([original])
    adapter.update.mockRejectedValueOnce(new Error('断网'))
    await expect(useTaskStore.getState().move('offline', 'doing', 0)).rejects.toThrow('断网')
    expect(useTaskStore.getState().tasks).toEqual([original])
    expect(records.get('offline')).toEqual(original)
  })

  it('移动后逐项批量完成仍各保存一次且回收站不受影响', async () => {
    const deleted = task('deleted', { deletedAt: '2026-10-27' })
    load([task('first'), task('second'), deleted])
    await useTaskStore.getState().move('first', 'doing', 0)
    for (const id of ['first', 'second']) await useTaskStore.getState().toggleDone(id)
    const saved = useTaskStore.getState().tasks
    expect(saved).toHaveLength(3)
    expect(saved.filter(item => item.id !== 'deleted').every(item => item.status === 'done' && item.completedAt)).toBe(true)
    expect(saved.find(item => item.id === 'deleted')).toEqual(deleted)
  })
})
