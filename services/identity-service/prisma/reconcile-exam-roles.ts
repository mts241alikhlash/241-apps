import { realpathSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { pgSslOptions } from '@mts241alikhlash/nest-core/database'
import { config as loadEnv } from 'dotenv'
import { PrismaClient } from '../src/generated/prisma/client.js'
import {
  DEFAULT_ROLES,
  resolveGrants,
} from '../src/access-control/role/domain/default-roles.js'
import { syncPermissions } from './seeds/modules/permission-sync.seed.js'

const STANDARDIZED_ROLE_CODES = new Set([
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
])

export interface ReconcileExamRolesResult {
  migratedUsers: number
  retiredAssessmentAdmin: 'deleted' | 'cleared' | 'absent'
  reconciledRoles: string[]
}

function isForeignKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2003'
  )
}

export async function reconcileExamRoles(
  prisma: PrismaClient,
): Promise<ReconcileExamRolesResult> {
  await syncPermissions(prisma)

  const targetRoleCodes = DEFAULT_ROLES.filter((role) =>
    STANDARDIZED_ROLE_CODES.has(role.code),
  ).map((role) => role.code)

  const txResult = await prisma.$transaction(async (tx) => {
    const permissions = await tx.permission.findMany({
      select: { id: true, code: true },
    })
    const permissionIdByCode = new Map(permissions.map((p) => [p.code, p.id]))
    const reconciledRoles: string[] = []

    for (const roleCode of targetRoleCodes) {
      const role = await tx.role.findUnique({
        where: { code: roleCode },
        select: { id: true },
      })
      if (!role) continue

      const desiredIds = resolveGrants(roleCode)
        .map((code) => permissionIdByCode.get(code))
        .filter((id): id is string => id !== undefined)

      await tx.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { notIn: desiredIds } },
      })
      if (desiredIds.length > 0) {
        await tx.rolePermission.createMany({
          data: desiredIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        })
      }
      reconciledRoles.push(roleCode)
    }

    let migratedUsers = 0
    const assessmentAdmin = await tx.role.findUnique({
      where: { code: 'ASSESSMENT_ADMIN' },
      select: { id: true },
    })

    if (assessmentAdmin) {
      const academicAdmin = await tx.role.findUnique({
        where: { code: 'ACADEMIC_ADMIN' },
        select: { id: true },
      })
      if (!academicAdmin) {
        throw new Error('ACADEMIC_ADMIN role not found')
      }

      const existingUserRoles = await tx.userRole.findMany({
        where: { roleId: assessmentAdmin.id },
        select: { userId: true },
      })
      if (existingUserRoles.length > 0) {
        const created = await tx.userRole.createMany({
          data: existingUserRoles.map(({ userId }) => ({
            userId,
            roleId: academicAdmin.id,
          })),
          skipDuplicates: true,
        })
        migratedUsers = created.count
      }
      await tx.userRole.deleteMany({ where: { roleId: assessmentAdmin.id } })
      await tx.rolePermission.deleteMany({
        where: { roleId: assessmentAdmin.id },
      })
    }

    return {
      assessmentAdminId: assessmentAdmin?.id ?? null,
      migratedUsers,
      reconciledRoles,
    }
  })

  let retiredAssessmentAdmin: ReconcileExamRolesResult['retiredAssessmentAdmin'] =
    'absent'

  if (txResult.assessmentAdminId) {
    try {
      await prisma.role.delete({ where: { id: txResult.assessmentAdminId } })
      retiredAssessmentAdmin = 'deleted'
    } catch (error) {
      if (isForeignKeyError(error)) {
        retiredAssessmentAdmin = 'cleared'
      } else {
        throw error
      }
    }
  }

  return {
    migratedUsers: txResult.migratedUsers,
    retiredAssessmentAdmin,
    reconciledRoles: txResult.reconciledRoles,
  }
}

async function main() {
  loadEnv()
  const connectionString =
    process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ''
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      ...pgSslOptions(connectionString),
    }),
  })
  try {
    const result = await reconcileExamRoles(prisma)
    console.log(
      `Reconciled ${result.reconciledRoles.length} roles; migrated ${result.migratedUsers} user assignments; ASSESSMENT_ADMIN: ${result.retiredAssessmentAdmin}.`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

function isEntrypoint(): boolean {
  if (
    typeof require !== 'undefined' &&
    typeof module !== 'undefined' &&
    require.main === module
  ) {
    return true
  }
  const entry = process.argv[1]
  if (!entry || typeof __filename === 'undefined') return false
  try {
    return realpathSync(entry) === realpathSync(__filename)
  } catch {
    return false
  }
}

if (isEntrypoint()) {
  main().catch((error) => {
    console.error('Exam role reconciliation failed:', error)
    process.exit(1)
  })
}
