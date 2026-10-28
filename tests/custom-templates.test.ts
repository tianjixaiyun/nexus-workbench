import { describe, expect, it } from 'vitest'
import { validateCustomTemplates, templateFromText } from '../src/features/tasks/customTemplates'
import { validateDeviceBackup } from '../src/lib/deviceBackup'

describe('本机自定义任务模板', () => {
  it('保留名称和清单条目，可通过设备备份验证', () => {
    const template = templateFromText('custom-1', '复习', '读一节\n\n做练习')
    expect(template.items.map(item => item.title)).toEqual(['读一节', '做练习'])
    expect(validateDeviceBackup({ 'nexus:task-templates': [template] })['nexus:task-templates']).toEqual([template])
  })
  it('拒绝损坏、重复 ID 与空清单，防止静默覆盖', () => {
    expect(() => templateFromText('custom-1', '名称', '  ')).toThrow()
    const template = templateFromText('custom-1', '名称', '任务')
    expect(() => validateCustomTemplates([template, template])).toThrow()
    expect(() => validateCustomTemplates([{ id: 'custom-2', name: 'x', items: '坏数据' }])).toThrow()
  })
})
