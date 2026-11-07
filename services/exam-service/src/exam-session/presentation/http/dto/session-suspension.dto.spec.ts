import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { SessionSuspensionRequestDto } from './session-suspension.dto.js'

function errorsFor(body: Record<string, unknown>): string[] {
  return validateSync(plainToInstance(SessionSuspensionRequestDto, body)).map(
    (error) => error.property,
  )
}

const valid = {
  reason: 'CALL',
  seconds: 120,
  clientId: '3f0d0e6a-6b1f-4b1a-9c5f-4d6e7f8a9b0c',
}

describe('SessionSuspensionRequestDto', () => {
  it('accepts a call report', () => {
    expect(errorsFor(valid)).toEqual([])
  })

  it('accepts the ends of the one to nine hundred second range', () => {
    expect(errorsFor({ ...valid, seconds: 1 })).toEqual([])
    expect(errorsFor({ ...valid, seconds: 900 })).toEqual([])
  })

  it('rejects a pause outside the range or without whole seconds', () => {
    expect(errorsFor({ ...valid, seconds: 0 })).toEqual(['seconds'])
    expect(errorsFor({ ...valid, seconds: 901 })).toEqual(['seconds'])
    expect(errorsFor({ ...valid, seconds: 120.5 })).toEqual(['seconds'])
    expect(errorsFor({ ...valid, seconds: '120' })).toEqual(['seconds'])
  })

  it('rejects a reason other than a call', () => {
    expect(errorsFor({ ...valid, reason: 'BREAK' })).toEqual(['reason'])
    expect(errorsFor({ ...valid, reason: 'call' })).toEqual(['reason'])
  })

  it('rejects a client id that is not a uuid v4', () => {
    expect(errorsFor({ ...valid, clientId: 'client-1' })).toEqual(['clientId'])
    expect(
      errorsFor({
        ...valid,
        clientId: '3f0d0e6a-6b1f-1b1a-9c5f-4d6e7f8a9b0c',
      }),
    ).toEqual(['clientId'])
  })
})
