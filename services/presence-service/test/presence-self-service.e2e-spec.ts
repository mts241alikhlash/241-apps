process.env.DATABASE_URL ??= 'postgresql://e2e:e2e@localhost:5432/e2e'
process.env.JWT_SECRET ??= 'test-jwt-secret-for-e2e-testing-minimum-32-chars'
process.env.S3_ENDPOINT ??= 'http://localhost:9000'
process.env.S3_BUCKET ??= 'e2e'
process.env.S3_ACCESS_KEY_ID ??= 'e2e'
process.env.S3_SECRET_ACCESS_KEY ??= 'e2e'
process.env.IDENTITY_SERVICE_URL ??= 'http://localhost:3000'
process.env.PROVISIONING_SERVICE_TOKEN ??= 'e2e-test-provisioning-token'

import { INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import type { Server } from 'node:http'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/core/database/prisma.service.js'
import { IIdentityPort } from '@mts241alikhlash/nest-core/identity'

const TEACHER_ID = '11111111-1111-4111-8111-111111111111'
const SOMEONE_ELSE = '22222222-2222-4222-8222-222222222222'

const READ_OWN = ['presence-records.read-own']

describe('presence self-service (FR-061)', () => {
  let app: INestApplication
  let server: Server
  let granted: string[] = READ_OWN

  const identity = {
    resolve: () =>
      Promise.resolve({
        userId: TEACHER_ID,
        identifier: 'guru',
        sessionId: '33333333-3333-4333-8333-333333333333',
        roles: ['GURU'],
        permissions: granted,
      }),
  }

  const bearer = `Bearer ${new JwtService({ secret: process.env.JWT_SECRET }).sign({ sub: TEACHER_ID, type: 'access' })}`

  const dailyPresence = { findMany: vi.fn().mockResolvedValue([]) }

  const prismaMock = {
    dailyPresence,
    presenceCredential: { findMany: vi.fn().mockResolvedValue([]) },
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
    vi.clearAllMocks()
    granted = READ_OWN
    dailyPresence.findMany.mockResolvedValue([])
  })

  describe('GET /presence/daily-records/me', () => {
    it('queries the caller, not a parameter', async () => {
      await request(server)
        .get('/presence/daily-records/me')
        .set('Authorization', bearer)
        .query({ year: 2026, month: 7 })
        .expect(200)

      const [call] = dailyPresence.findMany.mock.calls as [
        { where: { userId: string } },
      ][]
      expect(call[0].where.userId).toBe(TEACHER_ID)
    })

    it('ignores a userId smuggled in as a query parameter', async () => {
      await request(server)
        .get('/presence/daily-records/me')
        .set('Authorization', bearer)
        .query({ year: 2026, month: 7, userId: SOMEONE_ELSE })
        .expect(200)

      const [call] = dailyPresence.findMany.mock.calls as [
        { where: { userId: string } },
      ][]
      expect(call[0].where.userId).toBe(TEACHER_ID)
      expect(call[0].where.userId).not.toBe(SOMEONE_ELSE)
    })
  })

  describe('the wider routes stay shut', () => {
    it.each([
      '/presence/daily-records?date=2026-07-01',
      `/presence/daily-records/${SOMEONE_ELSE}`,
      '/presence/daily-records/recap?year=2026&month=7',
    ])('refuses %s for a read-own holder', async (path) => {
      const response = await request(server)
        .get(path)
        .set('Authorization', bearer)

      expect(response.status).toBe(403)
    })
  })
})
