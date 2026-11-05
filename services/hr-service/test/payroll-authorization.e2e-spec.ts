process.env.DATABASE_URL ??= 'postgresql://e2e:e2e@localhost:5432/e2e'
process.env.JWT_SECRET ??= 'test-jwt-secret-for-e2e-testing-minimum-32-chars'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.ACADEMIC_SERVICE_URL ??= 'http://localhost:3200'
process.env.PRESENCE_SERVICE_URL ??= 'http://localhost:3400'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'e2e-test-provisioning-token'

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server } from 'node:http'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/core/database/prisma.service.js'
import { IIdentityPort } from '@mts241alikhlash/nest-core/identity'

const ADMIN_ID = '11111111-1111-4111-8111-111111111111'
const UUID = '22222222-2222-4222-8222-222222222222'
const SESSION_ID = '33333333-3333-4333-8333-333333333333'

interface Route {
  method: 'get' | 'post' | 'patch' | 'delete'
  path: string
  permission: string
}

const ROUTES: Route[] = [
  {
    method: 'get',
    path: '/payroll/components',
    permission: 'payroll-components.read',
  },
  {
    method: 'post',
    path: '/payroll/components',
    permission: 'payroll-components.create',
  },
  {
    method: 'patch',
    path: `/payroll/components/${UUID}`,
    permission: 'payroll-components.update',
  },
  {
    method: 'delete',
    path: `/payroll/components/${UUID}`,
    permission: 'payroll-components.delete',
  },
  {
    method: 'get',
    path: '/payroll/assignments',
    permission: 'payroll-salaries.read',
  },
  {
    method: 'get',
    path: `/payroll/assignments/user/${UUID}`,
    permission: 'payroll-salaries.read',
  },
  {
    method: 'post',
    path: '/payroll/assignments',
    permission: 'payroll-salaries.update',
  },
  {
    method: 'delete',
    path: `/payroll/assignments/${UUID}`,
    permission: 'payroll-salaries.update',
  },
  { method: 'get', path: '/payroll/runs', permission: 'payroll-runs.read' },
  {
    method: 'get',
    path: `/payroll/runs/${UUID}`,
    permission: 'payroll-runs.read',
  },
  { method: 'post', path: '/payroll/runs', permission: 'payroll-runs.create' },
  {
    method: 'post',
    path: `/payroll/runs/${UUID}/recalculate`,
    permission: 'payroll-runs.update',
  },
  {
    method: 'post',
    path: `/payroll/runs/${UUID}/submit`,
    permission: 'payroll-runs.update',
  },
  {
    method: 'post',
    path: `/payroll/runs/${UUID}/approve`,
    permission: 'payroll-runs.approve',
  },
  {
    method: 'get',
    path: `/payroll/runs/${UUID}/payslips`,
    permission: 'payroll-payslips.read',
  },
  {
    method: 'get',
    path: '/payroll/payslips/me',
    permission: 'payroll-payslips.read-own',
  },
  {
    method: 'get',
    path: `/payroll/payslips/${UUID}`,
    permission: 'payroll-payslips.read',
  },
]

describe('payroll authorization (ADR-0008)', () => {
  let app: INestApplication
  let server: Server

  let grantedPermissions: string[] = []
  let roleCodes = ['ADMIN']

  const identity = {
    resolve: () =>
      Promise.resolve({
        userId: ADMIN_ID,
        identifier: 'admin',
        sessionId: SESSION_ID,
        roles: roleCodes,
        permissions: grantedPermissions,
      }),
  }

  const bearer = `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: ADMIN_ID, type: 'access' })}`

  const prismaMock = {
    salaryComponent: { findMany: vi.fn().mockResolvedValue([]) },
    salaryAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    payrollRun: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    payslip: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
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
    grantedPermissions = []
    roleCodes = ['ADMIN']
  })

  describe.each(ROUTES)('$method $path', (route) => {
    it(`denies an ADMIN with no explicit ${route.permission}`, async () => {
      const response = await request(server)
        [route.method](route.path)
        .set('Authorization', bearer)
        .send({})

      expect(response.status).toBe(403)
    })

    it(`admits the same account once ${route.permission} is granted`, async () => {
      grantedPermissions = [route.permission]

      const response = await request(server)
        [route.method](route.path)
        .set('Authorization', bearer)
        .send({})

      expect(response.status).not.toBe(403)
    })
  })

  it('lets SUPER_ADMIN through without an explicit grant', async () => {
    roleCodes = ['SUPER_ADMIN']

    const response = await request(server)
      .get('/payroll/components')
      .set('Authorization', bearer)

    expect(response.status).not.toBe(403)
  })

  it('denies an account holding no role at all', async () => {
    roleCodes = []

    const response = await request(server)
      .get('/payroll/components')
      .set('Authorization', bearer)

    expect(response.status).toBe(403)
  })
})
