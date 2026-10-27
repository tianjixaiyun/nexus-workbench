import { expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ owner: 'account-a', inserted: null as null | Record<string, unknown> }))
vi.mock('../src/lib/config', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: mock.owner } } }, error: null }) },
    from: () => ({ insert: (row: Record<string, unknown>) => { mock.inserted = row; return { select: () => ({ single: async () => ({ data: { ...row, created_at: '2026-10-27T00:00:00Z' }, error: null }) }) } } }),
  },
}))
import { cloudAdapter } from '../src/lib/data/cloudAdapter'

it('cloud creation supplies a fresh UUID even for tables without a server default', async () => {
  await cloudAdapter.habits.create({ name: '读书', icon: '📖', color: 'cyan' })
  expect(mock.inserted?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  expect(mock.inserted?.user_id).toBe('account-a')
})

it('does not send a record when getSession returns a different account than the confirmed import owner', async () => {
  const { BACKUP_IMPORT_USER } = await import('../src/lib/backupImport')
  mock.owner = 'account-b'
  mock.inserted = null
  await expect(cloudAdapter.habits.create({ name: 'A的私密记录', icon: '📖', color: 'cyan', [BACKUP_IMPORT_USER]: 'account-a' } as never)).rejects.toThrow(/账号/)
  expect(mock.inserted).toBeNull()
})
