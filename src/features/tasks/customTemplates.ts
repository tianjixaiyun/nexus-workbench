export const CUSTOM_TEMPLATE_KEY = 'nexus:task-templates'
export interface CustomTemplate { id: string; name: string; items: { title: string }[] }

export function validateCustomTemplates(raw: unknown): CustomTemplate[] {
  if (!Array.isArray(raw) || raw.length > 30) throw new Error('个人模板数据无效或超过 30 个。')
  const seen = new Set<string>()
  return raw.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('个人模板格式不正确。')
    const item = value as Record<string, unknown>
    if (Object.keys(item).some(key => !['id', 'name', 'items'].includes(key))) throw new Error('个人模板含有不支持的字段。')
    if (typeof item.id !== 'string' || !/^custom-[\w-]{1,100}$/.test(item.id) || seen.has(item.id)) throw new Error('个人模板 ID 无效或重复。')
    seen.add(item.id)
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60) throw new Error('模板名称应为 1 至 60 字。')
    if (!Array.isArray(item.items) || item.items.length < 1 || item.items.length > 50) throw new Error('每个模板需要 1 至 50 项任务。')
    const items = item.items.map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => key !== 'title')) throw new Error('模板任务格式不正确。')
      const title = (entry as Record<string, unknown>).title
      if (typeof title !== 'string' || !title.trim() || title.length > 500 || /[\r\n]/.test(title)) throw new Error('每项任务需要 1 至 500 字。')
      return { title: title.trim() }
    })
    return { id: item.id, name: item.name.trim(), items }
  })
}

export function templateFromText(id: string, name: string, text: string): CustomTemplate {
  const items = text.split(/\r?\n/).map(title => title.trim()).filter(Boolean).map(title => ({ title }))
  return validateCustomTemplates([{ id, name, items }])[0]
}
