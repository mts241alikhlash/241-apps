import { HealthIndicatorService } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { HEALTH_DATABASE } from './health-database.js'
import { PrismaHealthIndicator } from './prisma.health.js'

describe('PrismaHealthIndicator', () => {
  async function indicatorWith($queryRaw: () => Promise<unknown>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaHealthIndicator,
        HealthIndicatorService,
        { provide: HEALTH_DATABASE, useValue: { $queryRaw } },
      ],
    }).compile()
    return moduleRef.get(PrismaHealthIndicator)
  }

  it('reports up when the database answers', async () => {
    const indicator = await indicatorWith(() => Promise.resolve([1]))
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'up' },
    })
  })

  it('reports down with the error message when the database fails', async () => {
    const indicator = await indicatorWith(() =>
      Promise.reject(new Error('connection refused')),
    )
    await expect(indicator.isHealthy('database')).resolves.toEqual({
      database: { status: 'down', message: 'connection refused' },
    })
  })
})
