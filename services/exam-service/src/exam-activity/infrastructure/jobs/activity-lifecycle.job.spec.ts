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
})
