import 'reflect-metadata'
import { HTTP_CODE_METADATA } from '@nestjs/common/constants'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { SessionExamController } from './session-exam.controller.js'

const expected: Record<string, string[]> = {
  questions: ['exam-sessions.take'],
  answers: ['exam-sessions.take'],
  save: ['exam-sessions.take'],
  saveBatch: ['exam-sessions.take'],
  submit: ['exam-sessions.take'],
  violations: ['exam-sessions.take'],
  file: ['exam-sessions.take'],
  cameraBlocked: ['exam-sessions.take'],
  events: ['exam-sessions.take'],
  resume: ['exam-sessions.take'],
  heartbeatNow: ['exam-sessions.take'],
  snapshot: ['exam-sessions.take'],
}

const handlerOf = (method: string) =>
  SessionExamController.prototype[
    method as keyof SessionExamController
  ] as unknown as object

describe('SessionExamController permissions', () => {
  it.each(Object.entries(expected))('%s requires %j', (method, codes) => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handlerOf(method))).toEqual(
      codes,
    )
  })

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      SessionExamController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(Object.keys(expected).sort())
  })
})

describe('SessionExamController answer routes answer with 200', () => {
  it.each(['saveBatch', 'submit'])('%s is not a 201', (method) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handlerOf(method))).toBe(200)
  })
})

describe('SessionExamController snapshot upload throttle', () => {
  it('admits a whole classroom behind one address', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', handlerOf('snapshot')),
    ).toBe(600)
    expect(
      Reflect.getMetadata('THROTTLER:TTLdefault', handlerOf('snapshot')),
    ).toBe(60_000)
  })
})
