import {
  DEFAULT_ROLES,
  resolveGrants,
} from '../src/access-control/role/domain/default-roles.js'
import { SYSTEM_PERMISSIONS } from '../src/access-control/permission/constants/permission-codes.constants.js'
import { reconcileExamRoles } from './reconcile-exam-roles.js'

const STANDARDIZED_ROLES = [
  'EXAM_ADMIN',
  'OPERATOR',
  'ACADEMIC_ADMIN',
  'CURRICULUM_STAFF',
  'VICE_PRINCIPAL_CURRICULUM',
  'VICE_PRINCIPAL_STUDENT_AFFAIRS',
  'PRINCIPAL',
  'TEACHER',
  'EXAM_SUPERVISOR',
  'EXAM_TECHNICIAN',
  'STUDENT',
]

interface FakeOptions {
  existingPermissions?: string[]
  existingRoles?: string[]
  initialRolePermissions?: Record<string, string[]>
  initialUserRoles?: Record<string, string[]>
  blockAssessmentAdminDelete?: boolean
}

function createFakePrisma(options: FakeOptions = {}) {
  let idSeq = 1
  const nextId = (prefix: string) => `${prefix}-${idSeq++}`

  const permissions = new Map<string, { id: string; code: string }>()
  for (const code of options.existingPermissions ?? []) {
    permissions.set(code, { id: nextId('perm'), code })
  }

  const roles = new Map<string, { id: string; code: string }>()
  for (const code of options.existingRoles ?? []) {
    roles.set(code, { id: nextId('role'), code })
  }

  let rolePermissions: { roleId: string; permissionId: string }[] = []
  for (const [roleCode, codes] of Object.entries(
    options.initialRolePermissions ?? {},
  )) {
    const role = roles.get(roleCode)
    if (!role) continue
    for (const code of codes) {
      const perm = permissions.get(code)
      if (perm) {
        rolePermissions.push({ roleId: role.id, permissionId: perm.id })
      }
    }
  }

  let userRoles: { userId: string; roleId: string }[] = []
  for (const [roleCode, userIds] of Object.entries(
    options.initialUserRoles ?? {},
  )) {
    const role = roles.get(roleCode)
    if (!role) continue
    for (const userId of userIds) {
      userRoles.push({ userId, roleId: role.id })
    }
  }

  const roleCodeById = (roleId: string) =>
    [...roles.values()].find((r) => r.id === roleId)?.code
  const permCodeById = (permId: string) =>
    [...permissions.values()].find((p) => p.id === permId)?.code

  const client = {
    permission: {
      findMany: vi.fn(() =>
        Promise.resolve([...permissions.values()].map((p) => ({ ...p }))),
      ),
      upsert: vi.fn(({ where }: { where: { code: string } }) => {
        const existing = permissions.get(where.code)
        if (existing) return Promise.resolve({ ...existing })
        const created = { id: nextId('perm'), code: where.code }
        permissions.set(where.code, created)
        return Promise.resolve({ ...created })
      }),
    },
    role: {
      upsert: vi.fn(({ where }: { where: { code: string } }) => {
        const existing = roles.get(where.code)
        if (existing) return Promise.resolve({ ...existing })
        const created = { id: nextId('role'), code: where.code }
        roles.set(where.code, created)
        return Promise.resolve({ ...created })
      }),
      findUnique: vi.fn(
        ({
          where,
          include,
        }: {
          where: { code?: string; id?: string }
          include?: { _count?: { select?: { rolePermissions?: boolean } } }
        }) => {
          const found = where.code
            ? roles.get(where.code)
            : [...roles.values()].find((r) => r.id === where.id)
          if (!found) return Promise.resolve(null)
          if (include?._count?.select?.rolePermissions) {
            const count = rolePermissions.filter(
              (rp) => rp.roleId === found.id,
            ).length
            return Promise.resolve({
              ...found,
              _count: { rolePermissions: count },
            })
          }
          return Promise.resolve({ ...found })
        },
      ),
      findMany: vi.fn(({ where }: { where: { code: { in: string[] } } }) =>
        Promise.resolve(
          where.code.in
            .map((code) => roles.get(code))
            .filter((r): r is { id: string; code: string } => r !== undefined),
        ),
      ),
      create: vi.fn(({ data }: { data: { code: string } }) => {
        const created = { id: nextId('role'), code: data.code }
        roles.set(data.code, created)
        return Promise.resolve({ ...created })
      }),
      delete: vi.fn(({ where }: { where: { id: string } }) => {
        const target = [...roles.values()].find((r) => r.id === where.id)
        if (!target) {
          return Promise.reject(new Error('Role not found'))
        }
        if (
          options.blockAssessmentAdminDelete &&
          target.code === 'ASSESSMENT_ADMIN'
        ) {
          const error = new Error('Foreign key constraint failed') as Error & {
            code: string
          }
          error.code = 'P2003'
          return Promise.reject(error)
        }
        roles.delete(target.code)
        rolePermissions = rolePermissions.filter(
          (rp) => rp.roleId !== target.id,
        )
        userRoles = userRoles.filter((ur) => ur.roleId !== target.id)
        return Promise.resolve({ ...target })
      }),
    },
    rolePermission: {
      createMany: vi.fn(
        ({
          data,
          skipDuplicates,
        }: {
          data: { roleId: string; permissionId: string }[]
          skipDuplicates?: boolean
        }) => {
          let count = 0
          for (const item of data) {
            const exists = rolePermissions.some(
              (rp) =>
                rp.roleId === item.roleId &&
                rp.permissionId === item.permissionId,
            )
            if (exists && skipDuplicates) continue
            rolePermissions.push({ ...item })
            count++
          }
          return Promise.resolve({ count })
        },
      ),
      deleteMany: vi.fn(
        ({
          where,
        }: {
          where: { roleId: string; permissionId?: { notIn: string[] } }
        }) => {
          const before = rolePermissions.length
          rolePermissions = rolePermissions.filter((rp) => {
            if (rp.roleId !== where.roleId) return true
            if (where.permissionId?.notIn) {
              return where.permissionId.notIn.includes(rp.permissionId)
            }
            return false
          })
          return Promise.resolve({ count: before - rolePermissions.length })
        },
      ),
    },
    userRole: {
      findMany: vi.fn(({ where }: { where: { roleId: string } }) =>
        Promise.resolve(
          userRoles
            .filter((ur) => ur.roleId === where.roleId)
            .map((ur) => ({ ...ur })),
        ),
      ),
      createMany: vi.fn(
        ({
          data,
          skipDuplicates,
        }: {
          data: { userId: string; roleId: string }[]
          skipDuplicates?: boolean
        }) => {
          let count = 0
          for (const item of data) {
            const exists = userRoles.some(
              (ur) => ur.userId === item.userId && ur.roleId === item.roleId,
            )
            if (exists && skipDuplicates) continue
            userRoles.push({ ...item })
            count++
          }
          return Promise.resolve({ count })
        },
      ),
      deleteMany: vi.fn(({ where }: { where: { roleId: string } }) => {
        const before = userRoles.length
        userRoles = userRoles.filter((ur) => ur.roleId !== where.roleId)
        return Promise.resolve({ count: before - userRoles.length })
      }),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  }

  return {
    prisma: client,
    hasRole: (code: string) => roles.has(code),
    permissionsForRole: (roleCode: string) => {
      const role = roles.get(roleCode)
      if (!role) return []
      return rolePermissions
        .filter((rp) => rp.roleId === role.id)
        .map((rp) => permCodeById(rp.permissionId)!)
        .sort()
    },
    usersForRole: (roleCode: string) => {
      const role = roles.get(roleCode)
      if (!role) return []
      return userRoles
        .filter((ur) => ur.roleId === role.id)
        .map((ur) => ur.userId)
        .sort()
    },
    snapshotState: () => ({
      roleCodes: [...roles.keys()].sort(),
      rolePermissions: [...roles.keys()].sort().map((code) => [
        code,
        rolePermissions
          .filter((rp) => roleCodeById(rp.roleId) === code)
          .map((rp) => permCodeById(rp.permissionId)!)
          .sort(),
      ]),
      userRoles: [...roles.keys()].sort().map((code) => [
        code,
        userRoles
          .filter((ur) => roleCodeById(ur.roleId) === code)
          .map((ur) => ur.userId)
          .sort(),
      ]),
    }),
  }
}

describe('reconcileExamRoles', () => {
  const catalogCodes = SYSTEM_PERMISSIONS.map((p) => p.code)

  it('migrates ASSESSMENT_ADMIN userRoles to ACADEMIC_ADMIN with skipDuplicates and deletes ASSESSMENT_ADMIN when unblocked', async () => {
    const fake = createFakePrisma({
      existingPermissions: catalogCodes,
      existingRoles: [
        ...DEFAULT_ROLES.map((r) => r.code).filter((c) => c !== 'EXAM_ADMIN'),
        'ASSESSMENT_ADMIN',
      ],
      initialUserRoles: {
        ASSESSMENT_ADMIN: ['user-1', 'user-2'],
        ACADEMIC_ADMIN: ['user-2', 'user-3'],
      },
      initialRolePermissions: {
        ASSESSMENT_ADMIN: ['exam-events.read', 'exam-scores.read-all'],
      },
    })

    const result = await reconcileExamRoles(fake.prisma as never)

    expect(result.migratedUsers).toBe(1)
    expect(result.retiredAssessmentAdmin).toBe('deleted')
    expect(fake.hasRole('ASSESSMENT_ADMIN')).toBe(false)
    expect(fake.hasRole('EXAM_ADMIN')).toBe(true)
    expect(fake.usersForRole('ACADEMIC_ADMIN')).toEqual([
      'user-1',
      'user-2',
      'user-3',
    ])
    expect(fake.prisma.userRole.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    )
  })

  it('clears ASSESSMENT_ADMIN rolePermissions and returns cleared when role delete hits P2003 FK constraint', async () => {
    const fake = createFakePrisma({
      existingPermissions: catalogCodes,
      existingRoles: [...DEFAULT_ROLES.map((r) => r.code), 'ASSESSMENT_ADMIN'],
      initialUserRoles: {
        ASSESSMENT_ADMIN: ['user-1'],
      },
      initialRolePermissions: {
        ASSESSMENT_ADMIN: ['exam-events.read', 'exam-scores.read-all'],
      },
      blockAssessmentAdminDelete: true,
    })

    const result = await reconcileExamRoles(fake.prisma as never)

    expect(result.migratedUsers).toBe(1)
    expect(result.retiredAssessmentAdmin).toBe('cleared')
    expect(fake.hasRole('ASSESSMENT_ADMIN')).toBe(true)
    expect(fake.permissionsForRole('ASSESSMENT_ADMIN')).toEqual([])
    expect(fake.usersForRole('ASSESSMENT_ADMIN')).toEqual([])
    expect(fake.usersForRole('ACADEMIC_ADMIN')).toEqual(['user-1'])
  })

  it('replaces stale permissions and grants missing ones for all standardized roles while keeping custom roles untouched', async () => {
    const fake = createFakePrisma({
      existingPermissions: catalogCodes,
      existingRoles: [
        ...DEFAULT_ROLES.map((r) => r.code).filter((c) => c !== 'EXAM_ADMIN'),
        'CUSTOM_ROLE',
      ],
      initialRolePermissions: {
        OPERATOR: ['exam-grading.grade', 'exam-events.read'],
        CURRICULUM_STAFF: ['exam-grading.grade', 'classrooms.read'],
        EXAM_TECHNICIAN: ['exam-rooms.supervise', 'exam-rooms.technician'],
        CUSTOM_ROLE: ['exam-grading.grade', 'exam-rooms.supervise'],
      },
    })

    const result = await reconcileExamRoles(fake.prisma as never)

    expect(result.retiredAssessmentAdmin).toBe('absent')
    expect(result.reconciledRoles.sort()).toEqual(
      [...STANDARDIZED_ROLES].sort(),
    )
    for (const roleCode of STANDARDIZED_ROLES) {
      expect(fake.permissionsForRole(roleCode)).toEqual(resolveGrants(roleCode))
    }
    expect(fake.permissionsForRole('OPERATOR')).not.toContain(
      'exam-grading.grade',
    )
    expect(fake.permissionsForRole('CURRICULUM_STAFF')).not.toContain(
      'exam-grading.grade',
    )
    expect(fake.permissionsForRole('EXAM_TECHNICIAN')).not.toContain(
      'exam-rooms.supervise',
    )
    expect(fake.permissionsForRole('CUSTOM_ROLE')).toEqual([
      'exam-grading.grade',
      'exam-rooms.supervise',
    ])
  })

  it('is idempotent on a second run with zero user migrations, absent ASSESSMENT_ADMIN, and zero permission diff', async () => {
    const fake = createFakePrisma({
      existingPermissions: catalogCodes.filter(
        (c) => c !== 'exam-settings.manage',
      ),
      existingRoles: [
        ...DEFAULT_ROLES.map((r) => r.code).filter((c) => c !== 'EXAM_ADMIN'),
        'ASSESSMENT_ADMIN',
      ],
      initialUserRoles: {
        ASSESSMENT_ADMIN: ['user-1'],
      },
      initialRolePermissions: {
        OPERATOR: ['exam-grading.grade'],
        CURRICULUM_STAFF: ['exam-grading.grade'],
        EXAM_TECHNICIAN: ['exam-rooms.supervise'],
      },
    })

    const first = await reconcileExamRoles(fake.prisma as never)
    expect(first.migratedUsers).toBe(1)
    expect(first.retiredAssessmentAdmin).toBe('deleted')

    const snapshotAfterFirst = fake.snapshotState()
    fake.prisma.rolePermission.deleteMany.mockClear()
    fake.prisma.rolePermission.createMany.mockClear()

    const second = await reconcileExamRoles(fake.prisma as never)
    expect(second.migratedUsers).toBe(0)
    expect(second.retiredAssessmentAdmin).toBe('absent')
    expect(second.reconciledRoles.sort()).toEqual(
      [...STANDARDIZED_ROLES].sort(),
    )
    expect(fake.snapshotState()).toEqual(snapshotAfterFirst)
    for (const call of fake.prisma.rolePermission.deleteMany.mock.results) {
      await expect(call.value).resolves.toEqual({ count: 0 })
    }
    for (const call of fake.prisma.rolePermission.createMany.mock.results) {
      await expect(call.value).resolves.toEqual({ count: 0 })
    }
  })
})
