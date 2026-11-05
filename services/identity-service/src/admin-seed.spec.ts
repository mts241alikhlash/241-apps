import {
  ensureAdminUser,
  type AdminUserStore,
} from '../prisma/seeds/modules/admin-user.seed.js'

interface Row {
  id: string
  identifier: string
  passwordHash: string
}

function fakeStore(rows: Row[] = []): AdminUserStore & { rows: Row[] } {
  return {
    rows,
    user: {
      findUnique: ({ where }) =>
        Promise.resolve(
          rows.find((row) => row.identifier === where.identifier) ?? null,
        ),
      create: ({ data }) => {
        const row = { id: `id-${rows.length + 1}`, ...data }
        rows.push(row)
        return Promise.resolve(row)
      },
      update: ({ where, data }) => {
        const row = rows.find((r) => r.id === where.id)
        if (!row) throw new Error('missing')
        Object.assign(row, data)
        return Promise.resolve(row)
      },
    },
  }
}

describe('ensureAdminUser', () => {
  it('creates the admin when the user does not exist', async () => {
    const store = fakeStore()
    const user = await ensureAdminUser(store, {
      identifier: 'admin',
      passwordHash: 'hash-1',
      reset: false,
    })
    expect(user.passwordHash).toBe('hash-1')
    expect(store.rows).toHaveLength(1)
  })

  it('keeps the password on a second run', async () => {
    const store = fakeStore()
    await ensureAdminUser(store, {
      identifier: 'admin',
      passwordHash: 'hash-1',
      reset: false,
    })
    const again = await ensureAdminUser(store, {
      identifier: 'admin',
      passwordHash: 'hash-2',
      reset: false,
    })
    expect(again.passwordHash).toBe('hash-1')
    expect(store.rows).toHaveLength(1)
  })

  it('resets the password only when asked to', async () => {
    const store = fakeStore()
    await ensureAdminUser(store, {
      identifier: 'admin',
      passwordHash: 'hash-1',
      reset: false,
    })
    const reset = await ensureAdminUser(store, {
      identifier: 'admin',
      passwordHash: 'hash-2',
      reset: true,
    })
    expect(reset.passwordHash).toBe('hash-2')
  })
})
