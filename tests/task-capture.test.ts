import { describe, expect, it, vi } from 'vitest'
import { captureIssue, parseTaskCapture, saveCaptureRows } from '../src/features/tasks/taskCapture'
import { groupAgendaTasks } from '../src/features/tasks/taskAgenda'
import { addSavedTaskView, parseSavedTaskViews, serializeSavedTaskViews } from '../src/features/tasks/savedViews'
import type { Task } from '../src/lib/data/types'

const today = new Date(2026, 9, 27)
describe('快速捕捉与批量录入', () => {
  it('单条只识别首行元数据，描述原文不被日期解析吞掉', () => {
    const [row] = parseTaskCapture('明天交方案 #工作 p1\n今天的会议记录 #资料\nhttps://example.com/#chapter', false, true, today)
    expect(row.input).toMatchObject({ title: '交方案', dueDate: '2026-10-28', priority: 'high', tags: ['工作', '资料'], description: '今天的会议记录 #资料\nhttps://example.com/#chapter' })
  })
  it('批量接受项目符号、复选框、序号和CRLF，保留同名行', () => {
    const rows = parseTaskCapture('- [ ] 明天复习 #学习\r\n2. 后天练习 p3\n\n+ 再来一次\n+ 再来一次', true, true, today)
    expect(rows.map(r => r.input.title)).toEqual(['复习', '练习', '再来一次', '再来一次'])
    expect(rows[1].input.dueDate).toBe('2026-10-29')
    expect(rows[1].input.priority).toBe('low')
  })
  it('关闭日期识别可保留字面表达，C#和URL片段不是标签', () => {
    const [row] = parseTaskCapture('明天研究 C# https://example.com/#code p1 #学习', false, false, today)
    expect(row.input).toMatchObject({ title: '明天研究 C# https://example.com/#code p1', dueDate: null, tags: ['学习'], priority: 'medium' })
  })
  it('空行不保存，纯元数据无标题和超过50条需先修正', () => {
    expect(captureIssue(parseTaskCapture(' \n', true, true, today))).toBeTruthy()
    expect(captureIssue(parseTaskCapture('明天 #工作 p1', true, true, today))).toContain('标题')
    expect(captureIssue(parseTaskCapture(Array(51).fill('一条任务').join('\n'), true, true, today))).toContain('50')
  })
  it('逐条确认成功，遇失败停止且仅保留未确认行，不自动重试', async () => {
    const rows = parseTaskCapture('第一条\n第二条\n第三条', true, true, today)
    const create = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('网络断开'))
    const progress = vi.fn()
    const result = await saveCaptureRows(rows, create, () => true, progress)
    expect(create).toHaveBeenCalledTimes(2)
    expect(progress).toHaveBeenCalledWith(1)
    expect(result.completed).toBe(1)
    expect(result.remaining.map(r => r.input.title)).toEqual(['第二条', '第三条'])
    expect(result.error).toContain('网络断开')
  })
  it('组件或账号上下文失效后，停止后续写入', async () => {
    let current = true
    const create = vi.fn(async () => { current = false })
    const result = await saveCaptureRows(parseTaskCapture('一\n二', true, true, today), create, () => current)
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.interrupted).toBe(true)
  })
})

describe('日程分组与保存视图', () => {
  it('按日期从早到晚排列，未排期最后，排除回收站且不改源数组', () => {
    const tasks = [{ id: 'later', dueDate: '2027-01-01' }, { id: 'none', dueDate: null }, { id: 'early', dueDate: '2026-12-31' }, { id: 'done', dueDate: '2026-12-31', status: 'done' }, { id: 'trash', dueDate: '2026-12-30', deletedAt: 'yes' }] as Task[]
    expect(groupAgendaTasks(tasks).map(g => [g.date, g.tasks.map(t => t.id)])).toEqual([['2026-12-31', ['early', 'done']], ['2027-01-01', ['later']], [null, ['none']]])
    expect(tasks[0].id).toBe('later')
  })
  it('未排期始终最后，即使日期是9999年', () => {
    expect(groupAgendaTasks([{ id: 'none', dueDate: null }, { id: 'far', dueDate: '9999-12-31' }] as Task[]).map(group => group.date)).toEqual(['9999-12-31', null])
  })
  it('日程视图和既有筛选一起保存及恢复，不影响旧视图', () => {
    const views = addSavedTaskView([], '每天安排', new URLSearchParams('scope=upcoming&tag=学习'), 'agenda', 'agenda-test')
    expect(parseSavedTaskViews(serializeSavedTaskViews(views))[0].query).toBe('scope=upcoming&tag=%E5%AD%A6%E4%B9%A0&view=agenda')
  })
})
