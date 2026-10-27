import type { SupabaseClient } from '@supabase/supabase-js'

export const CLOUD_CONNECTION_KEY = 'nexus:cloud-connection'
export interface CloudConnection { mode: 'cloud'; url: string; publicKey: string }
export interface LocalConnection { mode: 'local' }
export type ConnectionConfig = CloudConnection | LocalConnection
export const CLOUD_TABLES = [
  ['tasks', '任务'], ['notes', '便签'], ['links', '书签'], ['habits', '习惯'],
  ['milestones', '倒数日'], ['dailies', '每日复盘'], ['goals', '目标'],
  ['works', '作品'], ['memos', '碎碎念'], ['expenses', '记账'], ['contacts', '人脉'],
] as const
export interface CloudTableCheck { table: string; label: string; ok: boolean; error?: string }

/** 这里只检查格式与公开角色，不把可解码 JWT 误称为已验证签名。 */
export function validateCloudConnection(input: { url: string; publicKey: string }): CloudConnection {
  if (!input || typeof input.url !== 'string' || /[\u0000-\u001f\u007f]/.test(input.url)) throw new Error('项目地址格式不正确')
  const rawUrl = input.url.trim()
  if (!/^https?:\/\/[^/?#\\]+\/?$/i.test(rawUrl)) throw new Error('项目地址只能包含协议、域名和可选端口，不能包含路径、查询或片段')
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new Error('请填写完整的 Supabase 项目地址') }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('项目地址必须是 HTTPS 纯域名地址，不能包含账号、路径、查询或片段；本机开发可用 HTTP localhost')
  }
  if (typeof input.publicKey !== 'string') throw new Error('请使用公开 publishable key 或旧版 anon key')
  const publicKey = input.publicKey.trim()
  let valid = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey)
  if (!valid && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(publicKey)) {
    try {
      const payload = publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      valid = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).role === 'anon'
    } catch { valid = false }
  }
  if (!valid) throw new Error('只接受公开 publishable key 或 role=anon 的旧版 key；不要填写 secret/service_role key')
  return { mode: 'cloud', url: url.origin, publicKey }
}

export function readCloudConnection(): ConnectionConfig | null {
  let raw: string | null
  try { raw = localStorage.getItem(CLOUD_CONNECTION_KEY) } catch { throw new Error('无法读取本机云端配置，请检查浏览器存储权限') }
  if (raw === null) return null
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('本机云端配置损坏，请在设置中重新保存连接或切回本地') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('本机云端配置格式不正确')
  const record = value as Record<string, unknown>
  if (record.mode === 'local') return { mode: 'local' }
  if (record.mode !== 'cloud') throw new Error('本机云端配置模式不正确')
  return validateCloudConnection(record as unknown as CloudConnection)
}

function persist(value: ConnectionConfig) {
  try { localStorage.setItem(CLOUD_CONNECTION_KEY, JSON.stringify(value)) } catch { throw new Error('无法保存连接设置，请检查浏览器存储权限或可用空间；当前模式未切换') }
}
/** 保存成功后由界面主动重载，当前运行中的适配器不会悄悄切换。 */
export function saveCloudConnection(config: CloudConnection): void { persist(validateCloudConnection(config)) }
export function useLocalConnection(): void { persist({ mode: 'local' }) }

/** 公开 Auth 设置只读探测，不创建会话、不读取或修改用户内容、不保存配置。 */
export async function testCloudConnection(candidate: { url: string; publicKey: string }, options: { signal?: AbortSignal } = {}): Promise<{ message: string }> {
  const config = validateCloudConnection(candidate)
  let response: Response
  try {
    response = await fetch(`${config.url}/auth/v1/settings`, { method: 'GET', headers: { apikey: config.publicKey }, signal: options.signal, cache: 'no-store', credentials: 'omit' })
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw new Error('连接测试已取消')
    throw new Error('无法连接 Auth 服务，请检查项目地址、网络和浏览器跨域限制')
  }
  if (!response.ok) throw new Error(`Auth 只读连接测试失败（HTTP ${response.status}），请核对项目地址和公开 key`)
  let settings: unknown
  try { settings = await response.json() } catch { throw new Error('Auth 服务返回了无法识别的响应') }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || !('external' in settings)) throw new Error('项目地址未返回 Supabase Auth 设置，请核对地址')
  return { message: 'Auth 服务可达，公开 key 已被接受。尚未验证登录、业务表或 RLS 写入隔离。' }
}

/** HEAD + limit(0) 检查登录账号能否读取表，不把它当作写入/RLS 隔离验收。 */
export async function checkCloudTables(client: SupabaseClient | null): Promise<CloudTableCheck[]> {
  const active = client
  if (!active) throw new Error('请先配置云端连接')
  const { data, error } = await active.auth.getSession()
  if (error || !data.session?.user?.id) throw new Error('请先登录，再检查业务表')
  const owner = data.session.user.id
  const results = await Promise.all(CLOUD_TABLES.map(async ([table, label]): Promise<CloudTableCheck> => {
    try {
      const result = await active.from(table).select('id', { head: true }).eq('user_id', owner).limit(0)
      return { table, label, ok: !result.error, ...(result.error ? { error: result.error.message } : {}) }
    } catch { return { table, label, ok: false, error: '读取检查失败，请检查网络或表权限' } }
  }))
  const current = await active.auth.getSession()
  if (current.error || current.data.session?.user?.id !== owner) throw new Error('检查期间登录账号已变化，请重新检查')
  return results
}
