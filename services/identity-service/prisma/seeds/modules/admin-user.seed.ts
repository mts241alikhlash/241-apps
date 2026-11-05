export interface AdminUserRow {
  id: string
  identifier: string
  passwordHash: string | null
}

export interface AdminUserStore {
  user: {
    findUnique(args: {
      where: { identifier: string }
    }): Promise<AdminUserRow | null>
    create(args: {
      data: { identifier: string; passwordHash: string; isActive: boolean }
    }): Promise<AdminUserRow>
    update(args: {
      where: { id: string }
      data: { passwordHash: string }
    }): Promise<AdminUserRow>
  }
}

export interface EnsureAdminInput {
  identifier: string
  passwordHash: string
  reset: boolean
}

export async function ensureAdminUser(
  store: AdminUserStore,
  input: EnsureAdminInput,
): Promise<AdminUserRow> {
  const existing = await store.user.findUnique({
    where: { identifier: input.identifier },
  })
  if (!existing) {
    return store.user.create({
      data: {
        identifier: input.identifier,
        passwordHash: input.passwordHash,
        isActive: true,
      },
    })
  }
  if (!input.reset) return existing
  return store.user.update({
    where: { id: existing.id },
    data: { passwordHash: input.passwordHash },
  })
}
