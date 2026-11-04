import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus'
import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller.js'
import { PrismaHealthIndicator } from './prisma.health.js'

describe('HealthController', () => {
  it('runs the database and memory checks', async () => {
    const check = vi.fn(
      async (indicators: (() => Promise<Record<string, unknown>>)[]) => {
        const details = Object.assign(
          {},
          ...(await Promise.all(indicators.map((run) => run()))),
        )
        return { status: 'ok', info: details, error: {}, details }
      },
    )
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            isHealthy: vi.fn().mockResolvedValue({
              database: { status: 'up' },
            }),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: vi.fn().mockResolvedValue({
              memory_heap: { status: 'up' },
            }),
          },
        },
      ],
    }).compile()

    const result = await moduleRef.get(HealthController).check()

    expect(result.status).toBe('ok')
    expect(Object.keys(result.details ?? {})).toEqual([
      'database',
      'memory_heap',
    ])
  })
})
