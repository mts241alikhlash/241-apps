import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdvanceActivityStatusUseCase } from '../../application/use-cases/advance-activity-status/advance-activity-status.use-case.js'
import { ActivityLifecycleJob } from './activity-lifecycle.job.js'

const EMPTY = { opened: [], closed: [], blocked: [] }

function build(execute: ReturnType<typeof vi.fn>) {
  return new ActivityLifecycleJob({
    execute,
  } as unknown as AdvanceActivityStatusUseCase)
}

describe('ActivityLifecycleJob', () => {
  afterEach(() => vi.restoreAllMocks())

  it('calls the use case with the current time', async () => {
    const execute = vi.fn().mockResolvedValue(EMPTY)

    await build(execute).run()

    expect(execute).toHaveBeenCalledWith(expect.any(Date))
  })

  it('skips while a previous run is in progress', async () => {
    let release: () => void = () => undefined
    const execute = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(EMPTY)
      }),
    )
    const job = build(execute)

    const first = job.run()
    await job.run()
    release()
    await first
    await job.run()

    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('logs a failure and allows the next run', async () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(EMPTY)
    const job = build(execute)

    await job.run()
    await job.run()

    expect(error).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('logs opened and closed ids', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined)
    const execute = vi
      .fn()
      .mockResolvedValue({ opened: ['a1', 'a2'], closed: ['a3'], blocked: [] })

    await build(execute).run()

    expect(log).toHaveBeenCalledWith(expect.stringContaining('a1, a2'))
    expect(log).toHaveBeenCalledWith(expect.stringContaining('a3'))
  })

  it('warns about blocked ids only when the set changes', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined)
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ opened: [], closed: [], blocked: ['a1'] })
      .mockResolvedValueOnce({ opened: [], closed: [], blocked: ['a1'] })
      .mockResolvedValueOnce({ opened: [], closed: [], blocked: ['a1', 'a2'] })
      .mockResolvedValueOnce(EMPTY)
      .mockResolvedValueOnce({ opened: [], closed: [], blocked: ['a1'] })
    const job = build(execute)

    for (let i = 0; i < 5; i += 1) await job.run()

    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenNthCalledWith(1, expect.stringContaining('a1'))
    expect(warn).toHaveBeenNthCalledWith(2, expect.stringContaining('a2'))
  })
})
