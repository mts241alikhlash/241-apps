import type { Mock } from 'vitest'
import {
  APPLICATION_VERIFIED_NOTIFICATION,
  VerifyApplicationWhenReadyUseCase,
} from './verify-when-ready.use-case.js'

const ready = {
  status: 'SUBMITTED',
  documents: [{ documentTypeId: 'kk', status: 'APPROVED' }],
  paymentStatus: 'VERIFIED',
}

function setup(overrides: Record<string, Mock> = {}) {
  const verification = {
    findSnapshot: vi.fn().mockResolvedValue(ready),
    findRequiredTypeIds: vi.fn().mockResolvedValue(['kk']),
    markVerified: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const notifications = { notify: vi.fn().mockResolvedValue(undefined) }
  const useCase = new VerifyApplicationWhenReadyUseCase(
    verification,
    notifications as never,
  )
  return { useCase, verification, notifications }
}

describe('VerifyApplicationWhenReadyUseCase', () => {
  it('verifies a ready application, records who, and tells the applicant once', async () => {
    const { useCase, verification, notifications } = setup()

    await expect(useCase.execute('app1', 'admin1')).resolves.toBe(true)

    expect(verification.markVerified).toHaveBeenCalledWith('app1', 'admin1', [
      'kk',
    ])
    expect(notifications.notify).toHaveBeenCalledTimes(1)
    expect(notifications.notify).toHaveBeenCalledWith(
      'app1',
      'STATUS_CHANGE',
      APPLICATION_VERIFIED_NOTIFICATION.title,
      APPLICATION_VERIFIED_NOTIFICATION.message,
    )
  })

  it('records no staff member for the applicant’s own resubmission', async () => {
    const { useCase, verification } = setup()

    await useCase.execute('app1', null)

    expect(verification.markVerified).toHaveBeenCalledWith('app1', null, ['kk'])
  })

  it.each([
    ['payment not verified', { ...ready, paymentStatus: 'PENDING' }],
    ['a document not approved', { ...ready, documents: [] }],
    ['not submitted', { ...ready, status: 'REVISION_NEEDED' }],
    ['already verified', { ...ready, status: 'VERIFIED' }],
  ])('does nothing while %s', async (_name, snapshot) => {
    const { useCase, verification, notifications } = setup({
      findSnapshot: vi.fn().mockResolvedValue(snapshot),
    })

    await expect(useCase.execute('app1', 'admin1')).resolves.toBe(false)
    expect(verification.markVerified).not.toHaveBeenCalled()
    expect(notifications.notify).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown application', async () => {
    const { useCase, verification } = setup({
      findSnapshot: vi.fn().mockResolvedValue(null),
    })

    await expect(useCase.execute('missing', 'admin1')).resolves.toBe(false)
    expect(verification.markVerified).not.toHaveBeenCalled()
  })

  it('is silent when another request verified it first', async () => {
    const { useCase, notifications } = setup({
      markVerified: vi.fn().mockResolvedValue(false),
    })

    await expect(useCase.execute('app1', 'admin1')).resolves.toBe(false)
    expect(notifications.notify).not.toHaveBeenCalled()
  })

  it('never throws when the database fails', async () => {
    const { useCase } = setup({
      findSnapshot: vi.fn().mockRejectedValue(new Error('connection reset')),
    })

    await expect(useCase.execute('app1', 'admin1')).resolves.toBe(false)
  })

  it('stays verified when only the notification fails', async () => {
    const { useCase, notifications } = setup()
    notifications.notify.mockRejectedValue(new Error('smtp down'))

    await expect(useCase.execute('app1', 'admin1')).resolves.toBe(true)
  })
})
