import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from './prisma.service.js'

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }))
vi.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: class {},
}))

const DATABASE_URL = 'postgresql://u:p@localhost:5432/exam?sslmode=require'

describe('PrismaService pool', () => {
  beforeEach(() => {
    vi.mocked(PrismaPg).mockClear()
  })

  it('passes the configured max and connection timeout to the adapter', () => {
    new PrismaService(
      new ConfigService({
        DATABASE_URL,
        DATABASE_POOL_MAX: 9,
        DATABASE_POOL_TIMEOUT_MS: 2500,
      }),
    )
    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ max: 9, connectionTimeoutMillis: 2500 }),
    )
  })

  it('falls back to the exam default of 12 connections and 4000 ms', () => {
    new PrismaService(new ConfigService({ DATABASE_URL }))
    expect(PrismaPg).toHaveBeenCalledWith(
      expect.objectContaining({ max: 12, connectionTimeoutMillis: 4000 }),
    )
  })
})
