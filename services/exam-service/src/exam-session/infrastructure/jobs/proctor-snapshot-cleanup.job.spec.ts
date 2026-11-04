import { ProctorSnapshotCleanupJob } from './proctor-snapshot-cleanup.job.js'

describe('ProctorSnapshotCleanupJob', () => {
  it('runs the cleanup use case', async () => {
    const execute = jest.fn().mockResolvedValue({ deletedCount: 0 })
    const job = new ProctorSnapshotCleanupJob({ execute } as never)

    await job.run()

    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('skips a tick while the previous run is still going', async () => {
    let release: (value: { deletedCount: number }) => void = () => undefined
    const execute = jest.fn(
      () =>
        new Promise<{ deletedCount: number }>((resolve) => {
          release = resolve
        }),
    )
    const job = new ProctorSnapshotCleanupJob({ execute } as never)

    const first = job.run()
    await job.run()
    release({ deletedCount: 0 })
    await first

    expect(execute).toHaveBeenCalledTimes(1)
  })
})
