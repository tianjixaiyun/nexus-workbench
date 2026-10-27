import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ owner: 'a', finish: null as null | ((value: unknown) => void), fail: false, toast: vi.fn(), status: vi.fn() }))
vi.mock('../src/lib/config', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mock.owner } } }, error: null }) },
  from: () => ({ insert: (row: Record<string, unknown>) => ({ select: () => ({ single: () => mock.fail ? Promise.resolve({ error: new Error('Network failed'), data: null }) : new Promise(resolve => { mock.finish = resolve; void row }) }) }) }),
} }))
vi.mock('../src/stores/toastStore', () => ({ toast: { error: mock.toast } }))
vi.mock('../src/stores/syncStore', () => ({ useSyncStore: { setState: mock.status } }))
import { cloudAdapter } from '../src/lib/data/cloudAdapter'
beforeEach(() => { mock.owner = 'a'; mock.finish = null; mock.fail = false; vi.clearAllMocks() })
it('a late mutation response from the previous account is not returned to the new account store', async () => {
  const pending = cloudAdapter.habits.create({ name: 'private', icon: 'x', color: 'cyan' })
  await vi.waitFor(() => expect(mock.finish).not.toBeNull())
  mock.owner = 'b'
  mock.finish!({ data: { id: 'a-record', name: 'private', icon: 'x', color: 'cyan', dates: [], created_at: '2026-10-27' }, error: null })
  await expect(pending).rejects.toThrow(/账号.*变化/)
})
it('failed cloud writes surface an actionable message without retrying the mutation', async () => {
  mock.fail = true
  await expect(cloudAdapter.habits.create({ name: 'private', icon: 'x', color: 'cyan' })).rejects.toThrow('Network failed')
  expect(mock.toast).toHaveBeenCalledOnce()
  expect(mock.status).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }))
})
