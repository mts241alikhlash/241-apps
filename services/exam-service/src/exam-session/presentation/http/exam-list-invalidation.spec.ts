import { MyExamsCacheService } from '../../application/my-exams-cache.service.js'
import { SessionExamController } from './session-exam.controller.js'
import { StudentExamController } from './student-exam.controller.js'

describe('exam list cache invalidation on the failing path', () => {
  it('drops the list of a student when starting throws', async () => {
    const cache = new MyExamsCacheService()
    const invalidate = vi.spyOn(cache, 'invalidate')
    const start = {
      execute: vi.fn(() => Promise.reject(new Error('CONFLICT'))),
    }
    const controller = new StudentExamController(
      {} as never,
      start as never,
      cache,
    )

    await expect(
      controller.start({ id: 'u1' }, 'WEB' as never, 'sched', {} as never),
    ).rejects.toThrow('CONFLICT')
    expect(invalidate).toHaveBeenCalledWith('u1')
  })

  it('drops the list of a student when submit throws', async () => {
    const cache = new MyExamsCacheService()
    const invalidate = vi.spyOn(cache, 'invalidate')
    const submit = {
      execute: vi.fn(() => Promise.reject(new Error('CONFLICT'))),
    }
    const none = {} as never
    const controller = new SessionExamController(
      none,
      none,
      none,
      none,
      none,
      submit as never,
      none,
      none,
      none,
      none,
      none,
      cache,
    )

    await expect(
      controller.submit({ id: 'u1' }, 'device', 'sid', {}),
    ).rejects.toThrow('CONFLICT')
    expect(invalidate).toHaveBeenCalledWith('u1')
  })
})
