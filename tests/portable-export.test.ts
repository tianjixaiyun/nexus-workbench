import { describe, expect, it } from 'vitest'
import type { Note, Task } from '../src/lib/data/types'
import { notesToMarkdown, tasksToCsv } from '../src/lib/portableExport'

describe('可迁移格式导出', () => {
  it('CSV 保护公式、保留引号和换行，排除回收站', () => {
    const rows = [{ title: '=2+2', description: '第一行\n"第二行"', status: 'todo', priority: 'high', dueDate: '2026-12-31', dueTime: '09:30', tags: ['工作'], subtasks: [], recurrence: 'none', deletedAt: null }, { title: '已删除', deletedAt: 'yes' }] as Task[]
    const csv = tasksToCsv(rows)
    expect(csv).toContain('"\'=2+2"')
    expect(csv).toContain('"第一行\n""第二行"""')
    expect(csv).toContain('"09:30"')
    expect(csv).not.toContain('已删除')
  })
  it('Markdown 保留原文，并排除回收站', () => {
    const notes = [{ title: '学习', content: '正文 **重点**\n- 第一步', updatedAt: '2026-10-28', deletedAt: null }, { title: '已删除', deletedAt: 'yes' }] as Note[]
    const markdown = notesToMarkdown(notes)
    expect(markdown).toContain('正文 **重点**\n- 第一步')
    expect(markdown).not.toContain('已删除')
  })
})
