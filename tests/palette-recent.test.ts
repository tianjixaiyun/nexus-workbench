import { describe, expect, it } from 'vitest'
import { loadRecentCommandKeys, recordRecentCommand, RECENT_COMMAND_LIMIT } from '../src/lib/paletteRecent'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
  }
}

describe('命令面板最近使用', () => {
  it('新的放最前,重复的只留一份', () => {
    const storage = memoryStorage()
    recordRecentCommand('page:/tasks', storage)
    recordRecentCommand('action:task', storage)
    recordRecentCommand('page:/tasks', storage)
    expect(loadRecentCommandKeys(storage)).toEqual(['page:/tasks', 'action:task'])
  })
  it('最多保留 10 条,最旧的被淘汰', () => {
    const storage = memoryStorage()
    for (let i = 0; i < RECENT_COMMAND_LIMIT + 3; i++) recordRecentCommand(`page:/cmd-${i}`, storage)
    const keys = loadRecentCommandKeys(storage)
    expect(keys).toHaveLength(RECENT_COMMAND_LIMIT)
    expect(keys[0]).toBe(`page:/cmd-${RECENT_COMMAND_LIMIT + 2}`)
    expect(keys).not.toContain('page:/cmd-0')
  })
  it('存储损坏或为空时回退到空列表', () => {
    const broken: Pick<Storage, 'getItem' | 'setItem'> = { getItem: () => 'not-json', setItem: () => {} }
    expect(loadRecentCommandKeys(broken)).toEqual([])
    expect(loadRecentCommandKeys(memoryStorage())).toEqual([])
  })
  it('非法条目(非字符串/空串)被过滤,不阻断后续读取', () => {
    const storage = memoryStorage()
    storage.setItem('nexus:palette-recent-v1', JSON.stringify(['', 42, 'page:/tasks', null, 'action:task']))
    expect(loadRecentCommandKeys(storage)).toEqual(['page:/tasks', 'action:task'])
  })
})
