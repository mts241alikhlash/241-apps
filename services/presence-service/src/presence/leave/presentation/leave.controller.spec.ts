import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ConfigService } from '@nestjs/config'
import { LeaveController } from './leave.controller.js'

const schoolTime = new SchoolTimeService({
  getOrThrow: () => 'Asia/Jakarta',
} as unknown as ConfigService)

const USER = { id: 'user-1' } as never

function build() {
  const getBalances = { execute: vi.fn().mockResolvedValue([]) }
  const controller = new LeaveController(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    getBalances as never,
    {} as never,
    schoolTime,
  )
  return { controller, getBalances }
}

describe('LeaveController year default', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('defaults to the new year at 06:30 WIB on 1 January (23:30 UTC on 31 December)', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const { controller, getBalances } = build()
    await controller.myBalances(undefined, USER)
    expect(getBalances.execute).toHaveBeenCalledWith('user-1', 2027)
  })

  it('still defaults to the old year one second before midnight WIB', async () => {
    vi.setSystemTime(new Date('2026-12-31T16:59:59Z'))
    const { controller, getBalances } = build()
    await controller.myBalances(undefined, USER)
    expect(getBalances.execute).toHaveBeenCalledWith('user-1', 2026)
  })

  it('applies the same default to the balances of another user', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const { controller, getBalances } = build()
    await controller.balancesFor('user-2', undefined)
    expect(getBalances.execute).toHaveBeenCalledWith('user-2', 2027)
  })

  it('lets an explicit year win', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const { controller, getBalances } = build()
    await controller.myBalances('2025', USER)
    expect(getBalances.execute).toHaveBeenCalledWith('user-1', 2025)
  })
})
