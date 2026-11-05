process.env.DATABASE_URL ??= 'postgresql://e2e:e2e@localhost:5432/e2e'
process.env.JWT_SECRET ??= 'test-jwt-secret-for-e2e-testing-minimum-32-chars'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'e2e-test-provisioning-token'

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server } from 'node:http'
import request from 'supertest'
import { IIdentityPort } from '@mts241alikhlash/nest-core/identity'
import { PrismaService } from '../src/core/database/prisma.service.js'
import { AppModule } from '../src/app.module.js'

const CALLER_USER_ID = '11111111-1111-4111-8111-111111111111'

let grantedPermissions: string[] = []

const identity = {
  resolve: () =>
    Promise.resolve({
      userId: CALLER_USER_ID,
      identifier: 'staf',
      sessionId: '55555555-5555-4555-8555-555555555555',
      roles: [] as string[],
      permissions: grantedPermissions,
    }),
}

const bearer = `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: CALLER_USER_ID, type: 'access' })}`

describe('inventory dashboard (e2e)', () => {
  let app: INestApplication
  let server: Server

  const prismaMock = {
    inventoryAssetUnit: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    inventoryStatus: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ id: 'status-loaned' }),
    },
    inventoryCondition: { findMany: vi.fn().mockResolvedValue([]) },
    inventoryLoan: { count: vi.fn().mockResolvedValue(2) },
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
  })

  it('refuses the asset summary without inventory-assets.read', async () => {
    await request(server)
      .get('/inventory/dashboard/assets')
      .set('Authorization', bearer)
      .expect(403)
  })

  it('refuses the loan summary with only the assets code', async () => {
    grantedPermissions = ['inventory-assets.read']
    await request(server)
      .get('/inventory/dashboard/loans')
      .set('Authorization', bearer)
      .expect(403)
  })

  it('answers the asset summary with its total', async () => {
    grantedPermissions = ['inventory-assets.read']
    prismaMock.inventoryAssetUnit.groupBy.mockResolvedValueOnce([
      { statusId: 's1', _count: { _all: 3 } },
    ])
    prismaMock.inventoryStatus.findMany.mockResolvedValueOnce([
      { id: 's1', name: 'Tersedia' },
    ])
    const response = await request(server)
      .get('/inventory/dashboard/assets')
      .set('Authorization', bearer)
      .expect(200)
    const body = response.body as { data: { total: number } }
    expect(body.data.total).toBe(3)
  })

  it('answers the loan summary with active and overdue counts', async () => {
    grantedPermissions = ['inventory-loans.read']
    const response = await request(server)
      .get('/inventory/dashboard/loans')
      .set('Authorization', bearer)
      .expect(200)
    const body = response.body as { data: { active: number; overdue: number } }
    expect(body.data).toEqual({ active: 2, overdue: 2 })
  })
})
