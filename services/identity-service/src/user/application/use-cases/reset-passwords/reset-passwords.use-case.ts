import { Injectable } from '@nestjs/common'
import {
  hashPassword,
  randomReadablePassword,
} from '@mts241alikhlash/nest-core/helpers'
import { IUserRepository } from '../../../domain/repositories/user.repository.js'
import { CreateAuditLogUseCase } from '../../../../audit-log/application/use-cases/create-audit-log/create-audit-log.use-case.js'

export interface ResetPasswordResult {
  userId: string
  identifier: string
  password: string
}

@Injectable()
export class ResetPasswordsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly createAuditLogUseCase: CreateAuditLogUseCase,
  ) {}

  async execute(userIds: string[]): Promise<ResetPasswordResult[]> {
    const uniqueIds = [...new Set(userIds)]
    if (uniqueIds.length === 0) return []

    const generated = await Promise.all(
      uniqueIds.map(async (userId) => {
        const password = randomReadablePassword()
        return { userId, password, passwordHash: await hashPassword(password) }
      }),
    )

    const rows = await this.userRepository.resetPasswords(
      generated.map(({ userId, passwordHash }) => ({ userId, passwordHash })),
    )

    const passwordById = new Map(
      generated.map(({ userId, password }) => [userId, password]),
    )
    const result = rows.flatMap(({ userId, identifier }) => {
      const password = passwordById.get(userId)
      return password === undefined ? [] : [{ userId, identifier, password }]
    })

    await this.createAuditLogUseCase.execute({
      action: 'account.passwords.reset',
      resource: 'accounts',
      metadata: { count: result.length },
    })

    return result
  }
}
