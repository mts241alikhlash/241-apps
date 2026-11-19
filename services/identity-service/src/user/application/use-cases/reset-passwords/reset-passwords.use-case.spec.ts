import type { Mock } from 'vitest'
import { hashPassword } from '@mts241alikhlash/nest-core/helpers'
import { IUserRepository } from '../../../domain/repositories/user.repository.js'
import { CreateAuditLogUseCase } from '../../../../audit-log/application/use-cases/create-audit-log/create-audit-log.use-case.js'
import { ResetPasswordsUseCase } from './reset-passwords.use-case.js'

vi.mock('@mts241alikhlash/nest-core/helpers', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hashPassword: vi.fn(),
}))

const READABLE = /^[A-HJ-NP-Za-km-z2-9]{10}$/
const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
const UNKNOWN = '33333333-3333-4333-8333-333333333333'

describe('ResetPasswordsUseCase', () => {
  const mockRepo = { resetPasswords: vi.fn() }
  const mockAudit = { execute: vi.fn() }
  const useCase = new ResetPasswordsUseCase(
    mockRepo as unknown as IUserRepository,
    mockAudit as unknown as CreateAuditLogUseCase,
  )

  beforeEach(() => {
    vi.clearAllMocks()
    ;(hashPassword as Mock).mockImplementation((password: string) =>
      Promise.resolve(`hash:${password}`),
    )
  })

  it('returns an empty list without touching the repository for no ids', async () => {
    expect(await useCase.execute([])).toEqual([])
    expect(mockRepo.resetPasswords).not.toHaveBeenCalled()
    expect(mockAudit.execute).not.toHaveBeenCalled()
  })

  it('gives each account its own readable password and stores only its hash', async () => {
    mockRepo.resetPasswords.mockImplementation((entries) =>
      Promise.resolve(
        entries.map((e: { userId: string }) => ({
          userId: e.userId,
          identifier: `nis-${e.userId.slice(0, 4)}`,
        })),
      ),
    )

    const result = await useCase.execute([ID_A, ID_B])

    expect(result).toHaveLength(2)
    expect(result[0].password).not.toBe(result[1].password)
    for (const row of result) {
      expect(row.password).toMatch(READABLE)
    }
    const sent = mockRepo.resetPasswords.mock.calls[0][0]
    for (const row of result) {
      expect(sent).toContainEqual({
        userId: row.userId,
        passwordHash: `hash:${row.password}`,
      })
    }
  })

  it('drops ids the repository does not know, without failing', async () => {
    mockRepo.resetPasswords.mockResolvedValue([
      { userId: ID_A, identifier: 'nis-a' },
    ])

    const result = await useCase.execute([ID_A, UNKNOWN])

    expect(result.map((r) => r.userId)).toEqual([ID_A])
  })

  it('writes one audit entry with the count and no password', async () => {
    mockRepo.resetPasswords.mockImplementation((entries) =>
      Promise.resolve(
        entries.map((e: { userId: string }) => ({
          userId: e.userId,
          identifier: 'x',
        })),
      ),
    )

    const result = await useCase.execute([ID_A, ID_B])

    expect(mockAudit.execute).toHaveBeenCalledTimes(1)
    const entry = JSON.stringify(mockAudit.execute.mock.calls[0][0])
    expect(entry).toContain('"count":2')
    for (const row of result) {
      expect(entry).not.toContain(row.password)
    }
  })
})
