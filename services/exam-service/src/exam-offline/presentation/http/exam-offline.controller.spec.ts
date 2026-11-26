import 'reflect-metadata'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { plainToInstance } from 'class-transformer'
import { BadRequestException, StreamableFile } from '@nestjs/common'
import { validate } from 'class-validator'
import type { Response } from 'express'
import { describe, expect, it } from 'vitest'
import {
  SCHEDULE_ID,
  STUDENTS,
  TEACHER,
  buildOffline,
  seatAll,
} from '../../application/exam-offline.test-support.js'
import { BuildScoreSheetUseCase } from '../../application/use-cases/build-score-sheet/build-score-sheet.use-case.js'
import { ImportOfflineScoresUseCase } from '../../application/use-cases/import-offline-scores/import-offline-scores.use-case.js'
import { RequestOfflinePublicationUseCase } from '../../application/use-cases/request-offline-publication/request-offline-publication.use-case.js'
import { GetOfflineRosterUseCase } from '../../application/use-cases/get-offline-roster/get-offline-roster.use-case.js'
import { ListOfflineSchedulesUseCase } from '../../application/use-cases/list-offline-schedules/list-offline-schedules.use-case.js'
import { SaveOfflineScoreUseCase } from '../../application/use-cases/save-offline-score/save-offline-score.use-case.js'
import {
  RequestOfflinePublicationDto,
  SaveOfflineScoreDto,
} from './dto/exam-offline-request.dto.js'
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
  importScores: WRITE,
  sheet: READ,
  publish: WRITE,
}

async function errorsOf(
  body: Record<string, unknown>,
  type: new () => object = SaveOfflineScoreDto,
) {
  const dto = plainToInstance(type, body, {
    enableImplicitConversion: true,
  })
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true })
}

function fakeResponse() {
  const headers: Record<string, string> = {}
  const res = {
    set: (values: Record<string, string>) => Object.assign(headers, values),
  } as unknown as Response
  return { headers, res }
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
      new ImportOfflineScoresUseCase(world.reader, world.results),
      new BuildScoreSheetUseCase(world.reader, world.academic),
      new RequestOfflinePublicationUseCase(world.reader, world.results),
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
    [{ rawScore: 40, note: null }],
    [{ rawScore: 40, note: '' }],
  ])('accepts the score body %j', async (body) => {
    expect(await errorsOf(body)).toEqual([])
  })

  it.each([
    [{ rawScore: '40' }],
    [{ rawScore: true }],
    [{ rawScore: Number.NaN }],
    [{ rawScore: Number.POSITIVE_INFINITY }],
    [{ note: 'tanpa nilai' }],
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

  it.each([[{}], [{ confirmMissing: true }], [{ confirmMissing: false }]])(
    'accepts the publish body %j',
    async (body) => {
      expect(await errorsOf(body, RequestOfflinePublicationDto)).toEqual([])
    },
  )

  it.each([
    [{ confirmMissing: 'true' }],
    [{ confirmMissing: 1 }],
    [{ all: true }],
  ])('refuses the publish body %j', async (body) => {
    expect(
      (await errorsOf(body, RequestOfflinePublicationDto)).length,
    ).toBeGreaterThan(0)
  })

  it('refuses an import without a file', async () => {
    const { controller: http } = controller()
    await expect(
      http.importScores(TEACHER, SCHEDULE_ID, undefined),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('imports the uploaded buffer by its original name', async () => {
    const { world, controller: http } = controller()

    const result = await http.importScores(TEACHER, SCHEDULE_ID, {
      buffer: Buffer.from('No. Peserta,Score\n7-001,40\n7-999,10\n'),
      originalname: 'nilai.csv',
      size: 30,
    } as Express.Multer.File)

    expect(result).toEqual({
      saved: 1,
      rejected: [
        {
          row: 3,
          participantNumber: '7-999',
          reason: 'No. Peserta tidak terdaftar di kelas ini',
        },
      ],
      skipped: [],
    })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.rawScore).toBe(40)
  })

  it('serves the sheet as an xlsx attachment with a safe name', async () => {
    const { controller: http } = controller()
    const { headers, res } = fakeResponse()

    const file = await http.sheet(TEACHER, SCHEDULE_ID, res)

    expect(file).toBeInstanceOf(StreamableFile)
    expect(headers).toMatchObject({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="score-sheet-tafsir-vii-a.xlsx"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    })
  })

  it('queues the publication and answers with the counts', async () => {
    const { controller: http } = controller()
    await http.save(TEACHER, SCHEDULE_ID, STUDENTS.ani, { rawScore: 40 })

    await expect(http.publish(TEACHER, SCHEDULE_ID, {})).rejects.toMatchObject({
      code: 'OFFLINE_SCORES_MISSING',
    })
    await expect(
      http.publish(TEACHER, SCHEDULE_ID, { confirmMissing: true }),
    ).resolves.toEqual({ queued: 1, missing: 2, absent: 0 })
  })
})
