import 'reflect-metadata'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { describe, expect, it } from 'vitest'
import {
  SCHEDULE_ID,
  STUDENTS,
  TEACHER,
  buildOffline,
  seatAll,
} from '../../application/exam-offline.test-support.js'
import { GetOfflineRosterUseCase } from '../../application/use-cases/get-offline-roster/get-offline-roster.use-case.js'
import { ListOfflineSchedulesUseCase } from '../../application/use-cases/list-offline-schedules/list-offline-schedules.use-case.js'
import { SaveOfflineScoreUseCase } from '../../application/use-cases/save-offline-score/save-offline-score.use-case.js'
import { SaveOfflineScoreDto } from './dto/exam-offline-request.dto.js'
import { ExamOfflineController } from './exam-offline.controller.js'

const READ = [
  'exam-grading.read',
  'exam-grading.read-all',
  'exam-grading.manage-all',
]
const WRITE = ['exam-grading.grade', 'exam-grading.manage-all']

const expected: Record<string, string[]> = {
  schedules: READ,
  roster: READ,
  save: WRITE,
}

async function errorsOf(body: Record<string, unknown>) {
  const dto = plainToInstance(SaveOfflineScoreDto, body, {
    enableImplicitConversion: true,
  })
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true })
}

function controller() {
  const world = buildOffline()
  seatAll(world)
  return {
    world,
    controller: new ExamOfflineController(
      new ListOfflineSchedulesUseCase(
        world.scope,
        world.schedules,
        world.activities,
        world.rooms,
        world.results,
        world.academic,
      ),
      new GetOfflineRosterUseCase(world.reader),
      new SaveOfflineScoreUseCase(world.reader, world.results),
    ),
  }
}

describe('ExamOfflineController', () => {
  it.each(Object.entries(expected))('%s accepts any of %j', (method, codes) => {
    const handler = ExamOfflineController.prototype[
      method as keyof ExamOfflineController
    ] as unknown as object
    expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
  })

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamOfflineController.prototype,
    ).filter((name) => name !== 'constructor')
    expect(routes.sort()).toEqual(Object.keys(expected).sort())
  })

  it.each([
    [{ rawScore: 40 }],
    [{ rawScore: 12.25, note: 'baik' }],
    [{ rawScore: null }],
  ])('accepts the score body %j', async (body) => {
    expect(await errorsOf(body)).toEqual([])
  })

  it.each([
    [{ rawScore: '40' }],
    [{ rawScore: true }],
    [{}],
    [{ rawScore: 1.234 }],
    [{ rawScore: 40, note: 'x'.repeat(301) }],
    [{ rawScore: 40, studentId: STUDENTS.ani }],
  ])('refuses the score body %j', async (body) => {
    expect((await errorsOf(body)).length).toBeGreaterThan(0)
  })

  it('saves a score and answers with the roster row', async () => {
    const { controller: http } = controller()

    const row = await http.save(TEACHER, SCHEDULE_ID, STUDENTS.ani, {
      rawScore: 40,
      note: 'ok',
    })

    expect(row).toMatchObject({
      studentId: STUDENTS.ani,
      state: 'SCORED',
      rawScore: 40,
      note: 'ok',
      publication: null,
    })
  })

  it('serves the roster and the schedule list as DTOs', async () => {
    const { controller: http } = controller()

    const roster = await http.roster(TEACHER, SCHEDULE_ID)
    const schedules = await http.schedules(TEACHER)

    expect(roster.map((row) => row.name)).toEqual(['Ani', 'Budi', 'Citra'])
    expect(schedules[0]).toMatchObject({
      scheduleId: SCHEDULE_ID,
      registered: 3,
      missing: 3,
    })
  })
})
