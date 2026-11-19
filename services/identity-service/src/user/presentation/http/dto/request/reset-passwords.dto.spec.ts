import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { ResetPasswordsDto } from './reset-passwords.dto.js'

const ID = '11111111-1111-4111-8111-111111111111'

const check = async (userIds: unknown) =>
  validate(plainToInstance(ResetPasswordsDto, { userIds }))

describe('ResetPasswordsDto', () => {
  it('accepts up to 500 uuid v4 ids, including none', async () => {
    expect(await check([])).toHaveLength(0)
    expect(await check([ID])).toHaveLength(0)
    expect(await check(Array(500).fill(ID))).toHaveLength(0)
  })

  it('rejects more than 500 ids', async () => {
    expect(await check(Array(501).fill(ID))).not.toHaveLength(0)
  })

  it('rejects values that are not uuids', async () => {
    expect(await check(['not-a-uuid'])).not.toHaveLength(0)
  })

  it('rejects a missing list', async () => {
    expect(await check(undefined)).not.toHaveLength(0)
  })
})
