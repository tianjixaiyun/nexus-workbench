import { describe, expect, it } from 'vitest'
import { APP_MODULES, commandItemsInDisplayOrder, commandSelectionIndex, shortcutDestination } from '../src/lib/modules'

describe('工作台模块导航', () => {
  it('保留原有数字快捷键的路由含义', () => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
    expect(keys.map(shortcutDestination)).toEqual([
      '/home', '/', '/tasks', '/goals', '/habits', '/focus', '/notes', '/stats', '/links', '/sanctuary',
    ])
    expect(shortcutDestination('x')).toBeUndefined()
  })

  it('为每个工作台和展示页提供唯一且可搜索的入口', () => {
    const paths = APP_MODULES.map((module) => module.to)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toEqual(expect.arrayContaining([
      '/home', '/', '/tasks', '/goals', '/habits', '/focus', '/notes', '/stats', '/links', '/trash',
      '/about', '/memos', '/expense', '/contacts', '/journal', '/achievements', '/sanctuary',
      '/portfolio', '/scrapbook',
    ]))
    expect(APP_MODULES.every((module) => module.label && module.keywords)).toBe(true)
  })
})

describe('命令面板结果', () => {
  it('以可视分组顺序返回唯一结果，键盘选择与屏幕顺序一致', () => {
    const items = [
      { key: 'task-1', group: '任务', label: '匹配任务' },
      { key: 'memo-1', group: '碎碎念', label: '匹配灵感' },
      { key: 'page-tasks', group: '页面', label: '任务中心' },
      { key: 'task-1', group: '任务', label: '重复任务' },
      { key: 'calc', group: '计算', label: '1+1=2' },
      { key: 'note-1', group: '笔记', label: '匹配笔记' },
    ]
    expect(commandItemsInDisplayOrder(items).map((item) => item.key)).toEqual([
      'calc', 'page-tasks', 'task-1', 'note-1', 'memo-1',
    ])
  })

  it('保留同组的相关性顺序且不改变输入数组', () => {
    const items = [
      { key: 'note-2', group: '笔记' },
      { key: 'note-1', group: '笔记' },
      { key: 'task-1', group: '任务' },
    ]
    const before = items.slice()
    expect(commandItemsInDisplayOrder(items).map((item) => item.key)).toEqual(['task-1', 'note-2', 'note-1'])
    expect(items).toEqual(before)
    expect(commandItemsInDisplayOrder([])).toEqual([])
  })
})

describe('搜索词变化时的立即回车', () => {
  it('新查询不会沿用旧列表位置，立即回车仍执行新结果首项', () => {
    const previousSelection = { query: '', index: 17 }
    const results = ['/home', '/notes', '/portfolio']
    const index = commandSelectionIndex('工作台', previousSelection, results.length)
    expect(results[index]).toBe('/home')
  })

  it('同一查询保留方向键选择，并安全处理结果缩短和零结果', () => {
    expect(commandSelectionIndex('工作台', { query: '工作台', index: 1 }, 3)).toBe(1)
    expect(commandSelectionIndex('工作台', { query: '工作台', index: 9 }, 3)).toBe(2)
    expect(commandSelectionIndex('工作台', { query: '工作台', index: 9 }, 0)).toBe(0)
  })
})
