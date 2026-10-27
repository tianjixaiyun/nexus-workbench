import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const key = 'sb_publishable_test_public_12345'
let values: Map<string, string>
beforeEach(() => {
  vi.resetModules(); vi.unstubAllEnvs()
  values = new Map()
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
it('validates and normalizes only origins and public frontend credentials', async () => {
  const { validateCloudConnection: validate } = await import('../src/lib/cloudConnection')
  expect(validate({ url: ' https://test.supabase.co/ ', publicKey: key })).toEqual({ mode: 'cloud', url: 'https://test.supabase.co', publicKey: key })
  expect(validate({ url: 'http://localhost:54321', publicKey: key }).url).toBe('http://localhost:54321')
  const anon = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role: 'anon' })).replace(/=/g, '')}.signature`
  expect(validate({ url: 'https://test.supabase.co', publicKey: anon }).publicKey).toBe(anon)
})
it.each(['http://public.test', 'https://user:pass@test.supabase.co', 'https://test.supabase.co/path', 'https://test.supabase.co/?q=1', 'https://test.supabase.co/#x', 'https://test.supabase.co\n'])('rejects unsafe or non-origin URL %s', async (url) => {
  const { validateCloudConnection: validate } = await import('../src/lib/cloudConnection')
  expect(() => validate({ url, publicKey: key })).toThrow()
})
it.each(['sb_secret_never_frontend', 'bad', `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role: 'service_role' })).replace(/=/g, '')}.signature`])('rejects nonpublic credential', async (publicKey) => {
  const { validateCloudConnection } = await import('../src/lib/cloudConnection')
  expect(() => validateCloudConnection({ url: 'https://test.supabase.co', publicKey })).toThrow(/公开|anon/)
})
it('browser local override wins over environment cloud and publishable env is supported', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://env.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key)
  values.set('nexus:cloud-connection', JSON.stringify({ mode: 'local' }))
  const config = await import('../src/lib/config')
  expect(config.isCloudMode).toBe(false); expect(config.connectionSource).toBe('browser')
})
it('invalid saved config surfaces an error and never falls through into environment cloud', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://env.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key)
  values.set('nexus:cloud-connection', '{broken')
  const config = await import('../src/lib/config')
  expect(config.isCloudMode).toBe(false); expect(config.connectionError).toMatch(/配置/)
  const { readCloudConnection } = await import('../src/lib/cloudConnection')
  expect(() => readCloudConnection()).toThrow()
})
it('save and local switch report storage failures without claiming a mode switch', async () => {
  const { saveCloudConnection, useLocalConnection } = await import('../src/lib/cloudConnection')
  vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota') } })
  expect(() => saveCloudConnection({ mode: 'cloud', url: 'https://test.supabase.co', publicKey: key })).toThrow(/保存/)
  expect(() => useLocalConnection()).toThrow(/保存/)
})
it('diagnosis is readonly, abortable and leaves browser configuration intact', async () => {
  values.set('nexus:cloud-connection', JSON.stringify({ mode: 'local' }))
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: {}, disable_signup: false }) })
  vi.stubGlobal('fetch', fetcher)
  const { testCloudConnection } = await import('../src/lib/cloudConnection')
  const signal = new AbortController().signal
  await testCloudConnection({ url: 'https://test.supabase.co', publicKey: key }, { signal })
  expect(fetcher.mock.calls[0][0]).toBe('https://test.supabase.co/auth/v1/settings')
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'GET', signal })
  expect(JSON.parse(values.get('nexus:cloud-connection')!)).toEqual({ mode: 'local' })
})
it('checks all eleven tables with zero-row user-scoped HEAD reads, reports each failure', async () => {
  const calls: unknown[] = []
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: 'a' } } }, error: null }) }, from: (table: string) => ({ select: (column: string, options: unknown) => ({ eq: (field: string, user: string) => ({ limit: async (n: number) => { calls.push({ table, column, options, field, user, n }); return { error: table === 'contacts' ? { message: 'missing' } : null } } }) }) }) }
  const { checkCloudTables } = await import('../src/lib/cloudConnection')
  const result = await checkCloudTables(client as never)
  expect(result).toHaveLength(11); expect(result.find(x => x.table === 'contacts')?.ok).toBe(false)
  expect(calls).toHaveLength(11)
  expect(calls[0]).toMatchObject({ column: 'id', options: { head: true }, field: 'user_id', user: 'a', n: 0 })
})

it.each(['https://test.supabase.co/?', 'https://test.supabase.co/#', 'https://test.supabase.co/a/..', 'https://test.supabase.co\\'])('rejects syntactically non-origin input %s before browser normalization', async (url) => {
  const { validateCloudConnection } = await import('../src/lib/cloudConnection')
  expect(() => validateCloudConnection({ url, publicKey: key })).toThrow()
})
it('uses publishable and legacy anon environment keys without a browser override', async () => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://env.supabase.co'); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', key)
  const config = await import('../src/lib/config')
  expect(config.isCloudMode).toBe(true); expect(config.connectionSource).toBe('environment')
  expect(config.activeCloudConnection?.publicKey).toBe(key)
  config.supabase?.auth.stopAutoRefresh()
})
it('readable stored cloud mode overrides environment and save normalizes without hot switching', async () => {
  const { saveCloudConnection, readCloudConnection } = await import('../src/lib/cloudConnection')
  const config = await import('../src/lib/config')
  saveCloudConnection({ mode: 'cloud', url: 'https://browser.supabase.co/', publicKey: key })
  expect(readCloudConnection()).toEqual({ mode: 'cloud', url: 'https://browser.supabase.co', publicKey: key })
  expect(config.isCloudMode).toBe(false)
  vi.resetModules()
  const reloaded = await import('../src/lib/config')
  expect(reloaded.isCloudMode).toBe(true); expect(reloaded.connectionSource).toBe('browser')
  reloaded.supabase?.auth.stopAutoRefresh()
})
