import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ owner: 'a', callback: null as null | ((event: string, session: unknown) => void), sessionFailure: false, listFailure: false, deferred: null as null | Promise<unknown[]>, subscriptions: [] as unknown[][], status: null as null | ((s: string) => void), remove: vi.fn(), unsubscribe: vi.fn(), channels: 0, lists: vi.fn() }))
const tables = ['tasks','notes','links','habits','milestones','dailies','goals','works','memos','expenses','contacts']
vi.mock('../src/lib/config', () => ({ isCloudMode: true, supabase: {
  auth: { getSession: async () => { if(mock.sessionFailure) throw new Error('network'); return { data: { session: { user: { id: mock.owner } } }, error: null } }, onAuthStateChange: (fn: typeof mock.callback) => { mock.callback = fn; return { data: { subscription: { unsubscribe: mock.unsubscribe } } } }, signOut: async () => ({ error: null }), signUp: async () => ({ data: { user: { id: 'a' }, session: null }, error: null }) },
  channel: () => { mock.channels++; const c = { on: (...args: unknown[]) => { mock.subscriptions.push(args); return c }, subscribe: (fn: typeof mock.status) => { mock.status = fn; return c } }; return c }, removeChannel: mock.remove,
} }))
vi.mock('../src/lib/data', () => ({ dataAdapter: Object.fromEntries(['tasks','notes','links','habits','milestones','dailies','goals','works','memos','expenses','contacts'].map(t => [t, { list: async () => { mock.lists(t); if(mock.listFailure && t === 'notes') throw new Error('missing notes'); return mock.deferred ?? [{ id: `${mock.owner}-${t}` }] } }])) }))
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); mock.remove.mockResolvedValue('ok'); mock.owner = 'a'; mock.sessionFailure = false; mock.listFailure = false; mock.deferred = null; mock.subscriptions = []; mock.channels = 0
  vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('navigator', { onLine: true })
})
afterEach(async () => { const { stopRealtime } = await import('../src/lib/data/realtime'); stopRealtime?.(); vi.useRealTimers(); vi.unstubAllGlobals() })
it('auth init failures finish ready and concurrent/repeated init creates just one listener', async () => {
  const { useAuthStore } = await import('../src/stores/authStore')
  mock.sessionFailure = true
  await useAuthStore.getState().init()
  expect(useAuthStore.getState().ready).toBe(true); expect(useAuthStore.getState().error).toBeTruthy()
  mock.sessionFailure = false
  await Promise.all([useAuthStore.getState().init(), useAuthStore.getState().init()])
  expect(useAuthStore.getState().user?.id).toBe('a')
  expect(mock.unsubscribe).not.toHaveBeenCalled()
})
it('registration email confirmation is a success result', async () => {
  const { useAuthStore } = await import('../src/stores/authStore')
  await expect(useAuthStore.getState().signUp('a@example.com', 'secret-password')).resolves.toEqual({ needsEmailConfirmation: true })
})
it('realtime covers eleven owner filtered tables, is idempotent and cleanup cancels pending work', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { startRealtime, stopRealtime } = await import('../src/lib/data/realtime')
  startRealtime(); startRealtime()
  expect(mock.channels).toBe(1); expect(mock.subscriptions).toHaveLength(11)
  expect(mock.subscriptions.map(x => (x[1] as { table: string }).table)).toEqual(tables)
  expect(mock.subscriptions.every(x => (x[1] as { filter: string }).filter === 'user_id=eq.a')).toBe(true)
  ;(mock.subscriptions[0][2] as () => void)(); stopRealtime(); await vi.runAllTimersAsync()
  expect(mock.remove).toHaveBeenCalled(); expect(mock.lists).not.toHaveBeenCalled()
})
it('refresh failures reject and retain the previous successful records', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { useTaskStore } = await import('../src/stores/taskStore'); useTaskStore.setState({ tasks: [{ id: 'keep' }] as never })
  const { refreshCloudData } = await import('../src/lib/data/realtime'); mock.listFailure = true
  await expect(refreshCloudData()).rejects.toThrow(/missing notes/)
  expect(useTaskStore.getState().tasks[0].id).toBe('keep')
  const { useSyncStore } = await import('../src/stores/syncStore'); expect(useSyncStore.getState().status).toBe('error')
})
it('a slow previous account refresh cannot overwrite the new account stores', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); await useAuthStore.getState().init()
  let resolve!: (v: unknown[]) => void; mock.deferred = new Promise(r => { resolve = r })
  const { refreshCloudData } = await import('../src/lib/data/realtime'); const pending = refreshCloudData()
  mock.owner = 'b'; mock.callback!('SIGNED_IN', { user: { id: 'b' } })
  resolve([{ id: 'old-a' }]); await pending
  const { useTaskStore } = await import('../src/stores/taskStore'); expect(useTaskStore.getState().tasks).toEqual([])
})
it('offline status stops channel and online reconnect creates a new one', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { startRealtime } = await import('../src/lib/data/realtime'); startRealtime(); mock.status!('SUBSCRIBED')
  const { useSyncStore } = await import('../src/stores/syncStore'); expect(useSyncStore.getState().status).toBe('live')
  window.dispatchEvent(new Event('offline')); expect(useSyncStore.getState().status).toBe('offline')
  window.dispatchEvent(new Event('online')); expect(mock.channels).toBe(2)
})


it('a complete successful refresh populates all tables and records its read time', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { refreshCloudData } = await import('../src/lib/data/realtime'); await refreshCloudData()
  const { useSyncStore } = await import('../src/stores/syncStore')
  expect(mock.lists).toHaveBeenCalledTimes(11)
  expect(useSyncStore.getState().lastSyncedAt).toBeTruthy()
  expect(useSyncStore.getState().refreshing).toBe(false)
  expect(useSyncStore.getState().status).not.toBe('live')
  const { useContactStore } = await import('../src/stores/contactStore')
  expect(useContactStore.getState().contacts[0].id).toBe('a-contacts')
})

it('successful retry restores live only when the realtime connection is actually subscribed', async () => {
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { refreshCloudData, startRealtime } = await import('../src/lib/data/realtime'); startRealtime(); mock.status!('SUBSCRIBED')
  const { useSyncStore } = await import('../src/stores/syncStore')
  mock.listFailure = true; await expect(refreshCloudData()).rejects.toThrow()
  expect(useSyncStore.getState().status).toBe('error')
  mock.listFailure = false; await refreshCloudData()
  expect(useSyncStore.getState().status).toBe('live'); expect(useSyncStore.getState().message).toBeNull()
})

it('returning to a visible page debounces a refresh; cleanup and offline suppress it', async () => {
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  vi.stubGlobal('document', page)
  const { useAuthStore } = await import('../src/stores/authStore'); useAuthStore.setState({ user: { id: 'a' }, ready: true })
  const { startRealtime, stopRealtime } = await import('../src/lib/data/realtime'); startRealtime()
  window.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(501)
  expect(mock.lists).toHaveBeenCalledTimes(11)
  mock.lists.mockClear(); page.visibilityState = 'hidden'; page.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(501); expect(mock.lists).not.toHaveBeenCalled()
  page.visibilityState = 'visible'; vi.stubGlobal('navigator', { onLine: false }); window.dispatchEvent(new Event('focus'))
  await vi.advanceTimersByTimeAsync(501); expect(mock.lists).not.toHaveBeenCalled()
  vi.stubGlobal('navigator', { onLine: true }); window.dispatchEvent(new Event('focus')); stopRealtime()
  await vi.advanceTimersByTimeAsync(501)
  window.dispatchEvent(new Event('focus')); page.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(501)
  expect(mock.lists).not.toHaveBeenCalled()
})
