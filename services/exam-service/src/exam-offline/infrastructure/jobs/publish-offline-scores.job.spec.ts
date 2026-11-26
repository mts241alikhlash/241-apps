import { describe, expect, it } from 'vitest'
import type { PublishOfflineScoresUseCase } from '../../application/use-cases/publish-offline-scores/publish-offline-scores.use-case.js'
import { PublishOfflineScoresJob } from './publish-offline-scores.job.js'

describe('PublishOfflineScoresJob', () => {
  it('skips a run while the previous one is still going', async () => {
    let calls = 0
    let release: () => void = () => undefined
    const useCase = {
      execute: () => {
        calls += 1
        return new Promise<number>((resolve) => {
          release = () => resolve(0)
        })
      },
    } as unknown as PublishOfflineScoresUseCase
    const job = new PublishOfflineScoresJob(useCase)

    const first = job.run()
    await job.run()
    release()
    await first
    const third = job.run()
    release()
    await third

    expect(calls).toBe(2)
  })

  it('runs again after a failed run', async () => {
    let calls = 0
    const useCase = {
      execute: () => {
        calls += 1
        return Promise.reject(new Error('down'))
      },
    } as unknown as PublishOfflineScoresUseCase
    const job = new PublishOfflineScoresJob(useCase)

    await expect(job.run()).rejects.toThrow('down')
    await expect(job.run()).rejects.toThrow('down')

    expect(calls).toBe(2)
  })
})
