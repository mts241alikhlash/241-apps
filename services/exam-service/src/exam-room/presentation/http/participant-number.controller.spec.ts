import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it, vi } from 'vitest'
import { ExamParticipantNumberController } from './participant-number.controller.js'
import { LookupParticipantNumbersBodyDto } from './dto/participant-number.dto.js'

const issue = vi.fn()
const lookup = vi.fn()
const controller = new ExamParticipantNumberController(
  { execute: issue } as never,
  { execute: lookup } as never,
)

const semesterId = '0b1f8c52-6f1e-4a8b-9c3d-2f7e1a9b4d10'
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('ExamParticipantNumberController', () => {
  it('requires exam-events.manage for issue and read permissions for lookup', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ExamParticipantNumberController.prototype.issue,
      ),
    ).toEqual(['exam-events.manage'])
    expect(
      Reflect.getMetadata(
        PERMISSIONS_ANY_KEY,
        ExamParticipantNumberController.prototype.lookup,
      ),
    ).toEqual([
      'exam-events.manage',
      'exam-events.read',
      'exam-grading.read',
      'exam-grading.read-all',
      'exam-grading.manage-all',
    ])
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ExamParticipantNumberController.prototype.lookup,
      ),
    ).toBeUndefined()
  })

  it('answers the issue result of the semester', async () => {
    issue.mockResolvedValueOnce({ issued: 2, skipped: [] })

    await expect(controller.issue({ semesterId })).resolves.toEqual({
      issued: 2,
      skipped: [],
    })
    expect(issue).toHaveBeenCalledWith(semesterId)
  })

  it('answers the numbers of the students that have one', async () => {
    lookup.mockResolvedValueOnce({
      items: [{ studentId: uuid(1), number: '241-1' }],
    })

    await expect(
      controller.lookup({ semesterId, studentIds: [uuid(1), uuid(2)] }),
    ).resolves.toEqual({ items: [{ studentId: uuid(1), number: '241-1' }] })
    expect(lookup).toHaveBeenCalledWith(semesterId, [uuid(1), uuid(2)])
  })

  it('rejects more than 1000 students', async () => {
    const tooMany = Array.from({ length: 1001 }, (_, i) => uuid(i))
    const errors = await validate(
      plainToInstance(LookupParticipantNumbersBodyDto, {
        semesterId,
        studentIds: tooMany,
      }),
    )
    expect(errors.map((error) => error.property)).toEqual(['studentIds'])

    const ok = await validate(
      plainToInstance(LookupParticipantNumbersBodyDto, {
        semesterId,
        studentIds: tooMany.slice(0, 1000),
      }),
    )
    expect(ok).toEqual([])
  })
})
