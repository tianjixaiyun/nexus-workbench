import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  cloud: true, auth: { ready: true, user: { id: 'a' } as { id: string } | null }, status: vi.fn(),
  entities: Object.fromEntries(['tasks','notes','links','habits','milestones','dailies','goals','works','memos','expenses','contacts'].map(key => [key, { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }])),
}))
vi.mock('../src/lib/config', () => ({ get isCloudMode() { return mock.cloud }, supabase: null }))
vi.mock('../src/stores/authStore', () => ({ useAuthStore: { getState: () => mock.auth } }))
vi.mock('../src/stores/syncStore', () => ({ useSyncStore: { setState: mock.status } }))
vi.mock('../src/lib/data', () => ({ dataAdapter: mock.entities }))
type State = { loaded: boolean; fetch: () => Promise<void>; reset: () => void; add: (v: never) => Promise<unknown>; upsert: (date: string, mood: number, note: string) => Promise<void> } & Record<string, unknown>
type Store = { getState: () => State; setState: (v: Record<string, unknown>) => void }
const definitions = [
  ['tasks', false, () => import('../src/stores/taskStore').then(m => m.useTaskStore)],
  ['notes', true, () => import('../src/stores/noteStore').then(m => m.useNoteStore)],
  ['links', false, () => import('../src/stores/linkStore').then(m => m.useLinkStore)],
  ['habits', false, () => import('../src/stores/habitStore').then(m => m.useHabitStore)],
  ['milestones', false, () => import('../src/stores/milestoneStore').then(m => m.useMilestoneStore)],
  ['dailies', false, () => import('../src/stores/dailyStore').then(m => m.useDailyStore)],
  ['goals', false, () => import('../src/stores/goalStore').then(m => m.useGoalStore)],
  ['works', true, () => import('../src/stores/workStore').then(m => m.useWorkStore)],
  ['memos', true, () => import('../src/stores/memoStore').then(m => m.useMemoStore)],
  ['expenses', true, () => import('../src/stores/expenseStore').then(m => m.useExpenseStore)],
  ['contacts', true, () => import('../src/stores/contactStore').then(m => m.useContactStore)],
] as const
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail }); return { promise, resolve, reject } }
afterEach(() => { vi.restoreAllMocks() })
describe.each(definitions)('%s request isolation and create reconciliation', (key, prepend, load) => {
  let store: Store
  const row = (id: string, title = id) => ({ id, title, date: id === 'other' ? '2026-10-26' : '2026-10-27', mood: 4, note: title })
  const rows = () => store.getState()[key] as ReturnType<typeof row>[]
  const create = () => key === 'dailies' ? store.getState().upsert('2026-10-27', 4, 'draft') : store.getState().add({ title: 'draft', status: 'todo' } as never)
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mock.cloud = true; mock.auth = { ready: true, user: { id: 'a' } }; mock.status.mockClear()
    mock.entities[key].list.mockReset(); mock.entities[key].create.mockReset()
    store = await load() as unknown as Store; store.getState().reset()
  })
  it('latest fetch wins over an older successful response', async () => {
    const old = deferred<unknown[]>(), latest = deferred<unknown[]>()
    mock.entities[key].list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = store.getState().fetch(), second = store.getState().fetch()
    latest.resolve([row('latest')]); await second; old.resolve([row('old')]); await first
    expect(rows().map(x => x.id)).toEqual(['latest'])
  })
  it('old account failure cannot clear the new account records or error state', async () => {
    const old = deferred<unknown[]>(); mock.entities[key].list.mockReturnValueOnce(old.promise)
    const pending = store.getState().fetch(); mock.auth.user = { id: 'b' }; store.getState().reset()
    store.setState({ [key]: [row('b-record')], loaded: true })
    old.reject(new Error('old account rejected')); await pending
    expect(rows().map(x => x.id)).toEqual(['b-record']); expect(mock.status).not.toHaveBeenCalled()
  })
  it('same-account reset invalidates prior requests before the next fetch', async () => {
    const old = deferred<unknown[]>(), latest = deferred<unknown[]>()
    mock.entities[key].list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const first = store.getState().fetch(); store.getState().reset(); const second = store.getState().fetch()
    latest.resolve([row('after-reset')]); await second; old.resolve([row('before-reset')]); await first
    expect(rows().map(x => x.id)).toEqual(['after-reset'])
  })
  it('account changes without a reset still reject a successful old response', async () => {
    const old = deferred<unknown[]>(); mock.entities[key].list.mockReturnValueOnce(old.promise)
    const pending = store.getState().fetch(); mock.auth.user = { id: 'b' }
    old.resolve([row('private-a')]); await pending
    expect(rows()).toEqual([]); expect(store.getState().loaded).toBe(false)
  })
  it('current failure keeps records and explicitly reports a sync error', async () => {
    store.setState({ [key]: [row('keep')], loaded: true }); mock.entities[key].list.mockRejectedValueOnce(new Error('network down'))
    await store.getState().fetch()
    expect(rows().map(x => x.id)).toEqual(['keep']); expect(store.getState().loaded).toBe(true)
    expect(mock.status).toHaveBeenCalledWith(expect.objectContaining({ status: 'error', message: expect.stringContaining('network down') }))
  })
  it('first failure finishes loading with an error rather than claiming a successful read', async () => {
    mock.entities[key].list.mockRejectedValueOnce(new Error('unavailable')); await store.getState().fetch()
    expect(rows()).toEqual([]); expect(store.getState().loaded).toBe(true)
    expect(mock.status).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
  })
  it('concurrent record changes are not rolled back by an older fetch', async () => {
    const old = deferred<unknown[]>(); mock.entities[key].list.mockReturnValueOnce(old.promise)
    const pending = store.getState().fetch(); store.setState({ [key]: [row('newer-edit')] })
    old.resolve([row('stale')]); await pending
    expect(rows().map(x => x.id)).toEqual(['newer-edit'])
  })
  it('local reads survive auth initialization from null to the local user', async () => {
    mock.cloud = false; mock.auth = { ready: false, user: null }
    const pendingRead = deferred<unknown[]>(); mock.entities[key].list.mockReturnValueOnce(pendingRead.promise)
    const pending = store.getState().fetch(); mock.auth = { ready: true, user: { id: 'local' } }
    pendingRead.resolve([row('local-record')]); await pending
    expect(rows().map(x => x.id)).toEqual(['local-record'])
  })
  it('a slow create response does not duplicate or roll back a realtime record', async () => {
    const pendingCreate = deferred<unknown>(); mock.entities[key].create.mockReturnValueOnce(pendingCreate.promise)
    const pending = create(); store.setState({ [key]: [row('other'), row('created', 'newer live edit')] })
    pendingCreate.resolve(row('created', 'old POST body')); await pending
    expect(rows().map(x => x.id)).toEqual(['other', 'created'])
    expect(rows()[1].title).toBe('newer live edit')
  })
  it('new records retain the module original insertion order', async () => {
    store.setState({ [key]: [row('other')] }); mock.entities[key].create.mockResolvedValueOnce(row('created'))
    await create()
    expect(rows().map(x => x.id)).toEqual(prepend ? ['created','other'] : ['other','created'])
  })
})
