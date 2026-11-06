import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ConfigService } from '@nestjs/config'
import { DailyRecordController } from './daily-record.controller.js'

const schoolTime = new SchoolTimeService({
  getOrThrow: () => 'Asia/Jakarta',
} as unknown as ConfigService)

const USER = { id: 'user-1' } as never

function build() {
  const getMine = {
    execute: vi.fn().mockResolvedValue({ year: 0, month: 0, days: [] }),
  }
  const controller = new DailyRecordController(
    {} as never,
    {} as never,
    getMine as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    schoolTime,
  )
  return { controller, getMine }
}

describe('DailyRecordController month default', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('defaults to December at 06:30 WIB on 1 December (23:30 UTC on 30 November)', async () => {
    vi.setSystemTime(new Date('2026-11-30T23:30:00Z'))
    const { controller, getMine } = build()
    await controller.mine({}, USER)
    expect(getMine.execute).toHaveBeenCalledWith('user-1', 2026, 12)
  })

  it('still defaults to November one second before midnight WIB', async () => {
    vi.setSystemTime(new Date('2026-11-30T16:59:59Z'))
    const { controller, getMine } = build()
    await controller.mine({}, USER)
    expect(getMine.execute).toHaveBeenCalledWith('user-1', 2026, 11)
  })

  it('lets an explicit year and month win', async () => {
    vi.setSystemTime(new Date('2026-11-30T23:30:00Z'))
    const { controller, getMine } = build()
    await controller.mine({ year: 2025, month: 3 }, USER)
    expect(getMine.execute).toHaveBeenCalledWith('user-1', 2025, 3)
  })
})
