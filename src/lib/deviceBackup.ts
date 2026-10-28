import { DASHBOARD_WIDGETS, normalizeDashboardLayout } from '@/features/dashboard/dashboardLayout'
import { FOCUS_STATE_KEY, newFocusTimer, normalizeFocusConfig } from './focusTimer'
import { isSafeUrl } from './utils'

export const DEVICE_BACKUP_LABELS = {
  'nexus:pomodoro': '专注历史与实际分钟',
  'nexus:journal': '工作日志（含手动编辑）',
  'nexus:settings': '主题、城市、首页布局与静心偏好',
  'nexus-focus-config': '专注时长与每日目标',
  'nexus-profile-v1': '个人档案与头像',
  'nexus-portfolio-about': '作品集自我介绍',
  'nexus-portfolio-email': '作品集联系邮箱',
  'nexus:portfolio-now': '作品集 NOW 清单',
  'nexus-guestbook': '手帐本地留言',
  'nexus-achievements': '成就解锁日期',
  'nexus-konami': '彩蛋进度',
  'nexus:task-view': '任务视图偏好',
} as const
export type DeviceBackupKey = keyof typeof DEVICE_BACKUP_LABELS
export type DeviceBackup = Partial<Record<DeviceBackupKey, unknown>>
const KEYS = Object.keys(DEVICE_BACKUP_LABELS) as DeviceBackupKey[]
const rawText = new Set<DeviceBackupKey>(['nexus-portfolio-about', 'nexus-portfolio-email', 'nexus:task-view'])
type Row = Record<string, unknown>
const fail = (label: string): never => { throw new Error(`本机补充数据中的 ${label} 格式不正确，未执行恢复`) }
function object(raw: unknown, label: string): Row {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(label)
  return raw as Row
}
function text(raw: unknown, label: string): string { return typeof raw === 'string' ? raw : fail(label) }
function day(raw: unknown): string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fail('日期')
  const value = new Date(`${raw}T12:00:00Z`)
  return Number.isFinite(value.getTime()) && value.toISOString().slice(0, 10) === raw ? raw : fail('日期')
}
function time(raw: unknown): string {
  const value = text(raw, '时间')
  return Number.isFinite(Date.parse(value)) ? value : fail('时间')
}
function strings(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) return fail(label)
  return [...raw]
}
function number(raw: unknown, label: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= min && raw <= max ? raw : fail(label)
}
function safeImage(raw: unknown): string {
  const value = text(raw, '头像')
  return !value || /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value) || /^https?:\/\//i.test(value) ? value : fail('头像地址')
}
function config(raw: unknown) {
  const value = object(raw, '专注配置')
  for (const key of ['work', 'short', 'long', 'dailyGoal']) {
    if (value[key] !== undefined) {
      const n = number(value[key], '专注配置', 1, key === 'dailyGoal' ? 50 : 180)
      if (!Number.isInteger(n)) fail('专注配置')
    }
  }
  return normalizeFocusConfig(value)
}
function validateValue(key: DeviceBackupKey, raw: unknown): unknown {
  if (rawText.has(key)) {
    const value = text(raw, DEVICE_BACKUP_LABELS[key])
    if (key === 'nexus:task-view' && !['list', 'kanban', 'calendar', 'agenda'].includes(value)) fail('任务视图')
    return value
  }
  if (key === 'nexus-konami') return typeof raw === 'boolean' ? raw : fail('彩蛋进度')
  if (key === 'nexus:portfolio-now') return strings(raw, 'NOW 清单')
  if (key === 'nexus-focus-config') return config(raw)
  const value = object(raw, DEVICE_BACKUP_LABELS[key])
  if (key === 'nexus:pomodoro') {
    const result: Row = {}
    for (const [date, count] of Object.entries(value)) {
      if (date === '__minutes' || date === '__completed') continue
      day(date)
      const n = number(count, '专注次数', 0)
      if (!Number.isInteger(n)) fail('专注次数')
      result[date] = n
    }
    const minutes: Row = {}
    if (value.__minutes !== undefined) for (const [date, amount] of Object.entries(object(value.__minutes, '实际专注分钟'))) {
      day(date)
      if (result[date] === undefined) fail('专注分钟缺少对应次数')
      minutes[date] = number(amount, '实际专注分钟', 0)
    }
    for (const [date, count] of Object.entries(result)) if (minutes[date] === undefined) minutes[date] = (count as number) * 25
    const completed: Row = {}
    if (value.__completed !== undefined) for (const [id, date] of Object.entries(object(value.__completed, '专注完成凭据'))) {
      if (!id || ['__proto__', 'constructor', 'prototype'].includes(id)) fail('专注完成凭据')
      completed[id] = day(date)
    }
    return { ...result, __minutes: minutes, __completed: completed }
  }
  if (key === 'nexus:journal') {
    const result: Row = {}
    for (const [date, record] of Object.entries(value)) {
      day(date)
      const entry = object(record, '工作日志')
      if (entry.date !== date || typeof entry.edited !== 'boolean') fail('工作日志')
      result[date] = { date, text: text(entry.text, '日志文字'), generatedAt: time(entry.generatedAt), edited: entry.edited }
    }
    return result
  }
  if (key === 'nexus:settings') {
    const result: Row = {}
    if (value.theme !== undefined) {
      if (typeof value.theme !== 'string' || !['dark', 'light'].includes(value.theme)) fail('主题')
      result.theme = value.theme
    }
    if (value.calmMode !== undefined) {
      if (typeof value.calmMode !== 'boolean') fail('静心偏好')
      result.calmMode = value.calmMode
    }
    if (value.weatherCity !== undefined) {
      if (value.weatherCity === null) result.weatherCity = null
      else {
        const city = object(value.weatherCity, '天气城市')
        result.weatherCity = { name: text(city.name, '城市名称'), lat: number(city.lat, '纬度', -90, 90), lon: number(city.lon, '经度', -180, 180) }
      }
    }
    if (value.dashboardLayout !== undefined) {
      const known = new Set<string>(DASHBOARD_WIDGETS.map((item) => item.id))
      if (!Array.isArray(value.dashboardLayout)) fail('首页布局')
      for (const entry of value.dashboardLayout as unknown[]) {
        const widget = object(entry, '首页组件')
        if (typeof widget.id !== 'string' || !known.has(widget.id) || typeof widget.visible !== 'boolean') fail('首页组件')
      }
      result.dashboardLayout = normalizeDashboardLayout(value.dashboardLayout)
    }
    return result
  }
  if (key === 'nexus-profile-v1') {
    const profile: Row = {}
    for (const field of ['name', 'tagline', 'email']) if (value[field] !== undefined) profile[field] = text(value[field], `档案 ${field}`)
    if (value.roles !== undefined) profile.roles = strings(value.roles, '身份标签')
    if (value.avatar !== undefined) profile.avatar = safeImage(value.avatar)
    for (const field of ['interests', 'socials']) {
      if (value[field] === undefined) continue
      if (!Array.isArray(value[field])) fail('档案列表')
      profile[field] = (value[field] as unknown[]).map((rawItem) => {
        const item = object(rawItem, '档案条目')
        const label = text(item.label, '档案标签')
        if (field === 'interests') return { label, note: text(item.note, '兴趣说明') }
        const url = text(item.url, '社交地址')
        if (!isSafeUrl(url)) fail('社交地址')
        return { label, url }
      })
    }
    return profile
  }
  if (key === 'nexus-achievements') {
    const result: Row = {}
    for (const [id, date] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(id)) fail('成就标识')
      result[id] = time(date)
    }
    return result
  }
  return fail(DEVICE_BACKUP_LABELS[key])
}

export function validateDeviceBackup(raw: unknown): DeviceBackup {
  const source = object(raw, '补充数据')
  const result: DeviceBackup = {}
  for (const [key, value] of Object.entries(source)) {
    if (!KEYS.includes(key as DeviceBackupKey)) fail(`不支持的存储键 ${key}`)
    if (key === 'nexus-guestbook') {
      if (!Array.isArray(value)) fail('手帐留言')
      result[key] = (value as unknown[]).map((record) => {
        const row = object(record, '留言')
        return { id: text(row.id, '留言 ID'), name: text(row.name, '留言署名'), text: text(row.text, '留言正文'), at: time(row.at) }
      })
    } else result[key as DeviceBackupKey] = validateValue(key as DeviceBackupKey, value)
  }
  return result
}

export function collectDeviceBackup(): DeviceBackup {
  const result: DeviceBackup = {}
  const timer = localStorage.getItem(FOCUS_STATE_KEY)
  if (timer) {
    try {
      const stored = JSON.parse(timer)
      if (stored?.config) result['nexus-focus-config'] = stored.config
    } catch { /* 活动快照不属于备份范围。 */ }
  }
  for (const key of KEYS) {
    // 新快照的配置优先，已废弃的旧配置损坏不应使有效新配置无法导出。
    if (key === 'nexus-focus-config' && result[key] !== undefined) continue
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try { result[key] = rawText.has(key) ? raw : key === 'nexus-konami' ? raw === '1' : JSON.parse(raw) }
    catch { throw new Error(`${DEVICE_BACKUP_LABELS[key]} 已损坏，导出已停止；原始数据未改动`) }
  }
  return validateDeviceBackup(result)
}
/** 本机补充数据分步恢复；失败尽力还原，不假定与 IndexedDB 跨存储原子提交。 */
export function restoreDeviceBackup(raw: DeviceBackup, keys: DeviceBackupKey[]): void {
  const source = validateDeviceBackup(raw)
  const patches = new Map<string, string>()
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new Error('选中的本机数据不在备份内')
    let value = source[key]
    if (key === 'nexus:settings') {
      let current: Row = {}
      try { current = object(JSON.parse(localStorage.getItem(key) ?? '{}'), '当前设置') } catch { /* 旧设置损坏时只恢复受验证偏好。 */ }
      value = { ...current, ...object(value, '设置') }
    }
    patches.set(key, rawText.has(key) ? value as string : key === 'nexus-konami' ? value ? '1' : '0' : JSON.stringify(value))
    if (key === 'nexus-focus-config') patches.set(FOCUS_STATE_KEY, JSON.stringify(newFocusTimer(value)))
  }
  const previous = new Map([...patches.keys()].map((key) => [key, localStorage.getItem(key)]))
  try {
    for (const [key, value] of patches) localStorage.setItem(key, value)
  } catch {
    let failed = false
    for (const [key, value] of previous) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) }
      catch { failed = true }
    }
    throw new Error(failed ? '本机补充数据恢复失败，部分旧值未能还原；请保留当前备份文件，检查浏览器存储权限后处理' : '本机补充数据恢复失败，已还原本次涉及的本机旧值')
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexus:focus-history'))
}


