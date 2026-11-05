process.env.DATABASE_URL ??= 'postgresql://e2e:e2e@localhost:5432/e2e'
process.env.JWT_SECRET ??= 'test-jwt-secret-for-e2e-testing-minimum-32-chars'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.HR_SERVICE_URL ??= 'http://localhost:3800'
process.env.STUDENT_SERVICE_URL ??= 'http://localhost:3900'
process.env.ACADEMIC_SERVICE_URL ??= 'http://localhost:3200'
process.env.PRESENCE_SERVICE_URL ??= 'http://localhost:3400'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'e2e-test-provisioning-token'

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server } from 'node:http'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { IAcademicLookupPort } from '../src/platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../src/platform/enrollment-lookup/enrollment-lookup.port.js'
import { IStudentIdentityReadPort } from '../src/platform/student-identity/student-identity.port.js'
import { PrismaService } from '../src/core/database/prisma.service.js'
import { IIdentityPort } from '@mts241alikhlash/nest-core/identity'

const CALLER_USER_ID = '11111111-1111-4111-8111-111111111111'
const CALLER_STUDENT_ID = '33333333-3333-4333-8333-333333333333'
const SOMEBODY_ELSE = '44444444-4444-4444-8444-444444444444'

let grantedPermissions: string[] = []

const identity = {
  resolve: () =>
    Promise.resolve({
      userId: CALLER_USER_ID,
      identifier: 'siswa',
      sessionId: '55555555-5555-4555-8555-555555555555',
      roles: [] as string[],
      permissions: grantedPermissions,
    }),
}

const bearer = `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: CALLER_USER_ID, type: 'access' })}`

interface PrismaWhere {
  isPublished?: boolean
  enrollment?: { studentId?: string; semesterId?: string }
}

describe('academic self-service (e2e)', () => {
  let app: INestApplication
  let server: Server

  const studentIdentity = { findStudentIdByUserId: vi.fn() }

  const enrollmentLookup = {
    search: vi.fn().mockResolvedValue([{ id: 'enrollment-1' }]),
  }

  function enrollmentQuery(): { studentId?: string; semesterId?: string } {
    expect(enrollmentLookup.search).toHaveBeenCalled()
    return enrollmentLookup.search.mock.calls[0][0] as {
      studentId?: string
      semesterId?: string
    }
  }

  const academicLookup = {
    findActiveSemester: vi.fn().mockResolvedValue({
      id: 'sem-active',
      academicYearId: 'year-active',
      typeName: null,
    }),
    listClassrooms: vi.fn().mockResolvedValue([]),
    listSemesters: vi.fn().mockResolvedValue([]),
  }

  const prismaMock = {
    semester: {
      findFirst: vi.fn().mockResolvedValue({ id: 'sem-active' }),
    },
    reportCard: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _avg: {} }),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }

  function whereOfListQuery(): PrismaWhere {
    expect(prismaMock.reportCard.findMany).toHaveBeenCalled()
    const args = prismaMock.reportCard.findMany.mock.calls[0][0] as {
      where: PrismaWhere
    }
    return args.where
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(IEnrollmentLookupPort)
      .useValue(enrollmentLookup)
      .overrideProvider(IAcademicLookupPort)
      .useValue(academicLookup)
      .overrideProvider(IStudentIdentityReadPort)
      .useValue(studentIdentity)
      .overrideProvider(IIdentityPort)
      .useValue(identity)
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
    server = app.getHttpServer() as Server
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    studentIdentity.findStudentIdByUserId.mockResolvedValue(CALLER_STUDENT_ID)
    prismaMock.semester.findFirst.mockResolvedValue({ id: 'sem-active' })
    prismaMock.reportCard.findMany.mockResolvedValue([])
    prismaMock.reportCard.count.mockResolvedValue(0)
    prismaMock.reportCard.aggregate.mockResolvedValue({ _avg: {} })
    grantedPermissions = ['report-cards.read-own']
  })

  describe('GET /rapors/me', () => {
    it('reads the caller and nobody else', async () => {
      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .expect(200)

      expect(enrollmentQuery().studentId).toBe(CALLER_STUDENT_ID)
    })

    it('ignores a studentId supplied by the caller', async () => {
      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .query({ studentId: SOMEBODY_ELSE })
        .expect(200)

      expect(enrollmentQuery().studentId).toBe(CALLER_STUDENT_ID)
      expect(enrollmentQuery().studentId).not.toBe(SOMEBODY_ELSE)
    })

    it('keeps the student scope alongside the semester fallback', async () => {
      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .expect(200)

      expect(enrollmentQuery().studentId).toBe(CALLER_STUDENT_ID)
      expect(enrollmentQuery().semesterId).toBe('sem-active')
    })

    it('forces the published filter regardless of what was asked for', async () => {
      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .query({ isPublished: 'false' })
        .expect(200)

      expect(whereOfListQuery().isPublished).toBe(true)
    })

    it('answers empty for a caller who is not a student, without querying', async () => {
      studentIdentity.findStudentIdByUserId.mockResolvedValue(null)

      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .expect(200)

      expect(prismaMock.reportCard.findMany).not.toHaveBeenCalled()
    })
  })

  describe('the permission is the boundary', () => {
    it('refuses the cohort route to a caller holding only read-own', async () => {
      grantedPermissions = ['report-cards.read-own']

      await request(server)
        .get('/rapors')
        .set('Authorization', bearer)
        .expect(403)
    })

    it('refuses the self-service route to a caller holding neither', async () => {
      grantedPermissions = []

      await request(server)
        .get('/rapors/me')
        .set('Authorization', bearer)
        .expect(403)
    })
  })
})
