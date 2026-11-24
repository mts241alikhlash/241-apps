import 'reflect-metadata'
import { Readable } from 'node:stream'
import {
  BadRequestException,
  ConflictException,
  ParseUUIDPipe,
} from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Test } from '@nestjs/testing'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PERMISSIONS_ANY_KEY } from '@mts241alikhlash/nest-core/access-control'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { FakeExamRoomRepository } from '../../application/exam-room.repository.fake.js'
import { AssignSupervisorUseCase } from '../../application/use-cases/assign-supervisor/assign-supervisor.use-case.js'
import { ManageExamEventsUseCase } from '../../application/use-cases/manage-exam-events/manage-exam-events.use-case.js'
import { ManageExamRoomsUseCase } from '../../application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import { RoomAccessService } from '../../application/room-access.service.js'
import {
  ExamRoomController,
  ExamRoomOverviewController,
} from './exam-room.controller.js'
import { ExamEventController } from './exam-event.controller.js'
import { RoomAccessCodeService } from '../../application/room-access-code.service.js'
import { AssignSeatsDto, ExamRoomSeatDto } from './dto/exam-room.dto.js'
import { PrintPackDto, PrintPackQueryDto } from './dto/print-pack.dto.js'
import { ResetCredentialsBodyDto } from './dto/reset-credentials.dto.js'
import { GetPrintPackUseCase } from '../../application/use-cases/get-print-pack/get-print-pack.use-case.js'
import { ResetEventCredentialsUseCase } from '../../application/use-cases/reset-event-credentials/reset-event-credentials.use-case.js'
import { GenerateSeatsUseCase } from '../../application/use-cases/generate-seats/generate-seats.use-case.js'
import { GenerateRoomSlotsUseCase } from '../../application/use-cases/generate-room-slots/generate-room-slots.use-case.js'
import { GenerateSeatsBodyDto } from './dto/exam-room.dto.js'
import type { PrintPack } from '../../application/use-cases/get-print-pack/get-print-pack.use-case.js'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

const roomRoutes: Record<string, string[]> = {
  accessCode: ['exam-rooms.supervise'],
  rotateToken: ['exam-rooms.technician'],
  update: ['exam-events.manage'],
  auditLogs: ['exam-rooms.supervise'],
  seats: ['exam-rooms.supervise'],
  assignSeat: ['exam-events.manage'],
  supervisors: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  assignSupervisor: ['exam-events.manage'],
  substitute: ['exam-rooms.technician'],
  allowLateEntry: ['exam-rooms.technician'],
  extendTime: ['exam-rooms.technician'],
  roomMonitor: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  roomReport: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  saveRoomReport: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  recordRoomAbsence: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  recordRoomFieldNote: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  submitRoomReport: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  verifyRoomReport: ['exam-rooms.manage-all'],
  replaceRoomReportFile: ['exam-rooms.manage-all'],
  downloadRoomReportFile: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
}

const roomAnyRoutes: Record<string, string[]> = {
  downloadRoomReportFile: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  accessCode: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  rotateToken: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  auditLogs: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  seats: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  supervisors: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  substitute: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  allowLateEntry: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  extendTime: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  roomMonitor: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  roomReport: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  saveRoomReport: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  recordRoomAbsence: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  recordRoomFieldNote: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  submitRoomReport: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
}

const overviewAnyRoutes: Record<string, string[]> = {
  list: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  roomReports: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
}

const eventRoutes: Record<string, string[]> = {
  create: ['exam-events.manage'],
  update: ['exam-events.manage'],
  createRoom: ['exam-events.manage'],
  resetPasswords: ['exam-events.manage'],
  generateSeats: ['exam-events.manage'],
  generateSupervisorSlots: ['exam-events.manage'],
}

const eventAnyRoutes: Record<string, string[]> = {
  list: [
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  findOne: [
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  roomsOfEvent: [
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  ],
  getPrintPack: ['exam-events.manage', 'exam-events.read'],
}

function handlers(prototype: object): string[] {
  return Object.getOwnPropertyNames(prototype).filter(
    (name) => name !== 'constructor',
  )
}

describe('ExamRoomController permissions', () => {
  it.each(
    Object.entries(roomRoutes).filter(([method]) => !(method in roomAnyRoutes)),
  )('%s requires all of %j', (method, codes) => {
    const handler = ExamRoomController.prototype[
      method as keyof ExamRoomController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it.each(Object.entries(roomAnyRoutes))(
    '%s accepts any of %j so manage-all reaches it',
    (method, codes) => {
      const handler = ExamRoomController.prototype[
        method as keyof ExamRoomController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no room route without a permission', () => {
    expect(handlers(ExamRoomController.prototype).sort()).toEqual(
      Object.keys(roomRoutes).sort(),
    )
  })

  it.each(Object.entries(overviewAnyRoutes))(
    'overview.%s accepts any of %j',
    (method, codes) => {
      const handler = ExamRoomOverviewController.prototype[
        method as keyof ExamRoomOverviewController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no overview route without a permission', () => {
    expect(handlers(ExamRoomOverviewController.prototype).sort()).toEqual(
      Object.keys(overviewAnyRoutes).sort(),
    )
  })
})

describe('ExamRoomController report file download', () => {
  it('serves the file as an attachment with a safe name', async () => {
    const stream = Readable.from(Buffer.from('%PDF-1.4'))
    const download = vi.fn().mockResolvedValue({
      stream,
      attachment: {
        mimeType: 'application/pdf',
        sizeBytes: 8,
        uploadedAt: new Date('2026-11-02T02:05:00Z'),
      },
      room: { code: 'R-01/../x' },
    })
    const controller: ExamRoomController = Object.assign(
      Object.create(ExamRoomController.prototype) as ExamRoomController,
      { submitReport: { download } },
    )
    const set = vi.fn()

    await controller.downloadRoomReportFile({ id: 'u' }, UUID_A, UUID_B, {
      set,
    } as never)

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="berita-acara-R-01x-20261102-0905.pdf"',
        'X-Content-Type-Options': 'nosniff',
      }),
    )
  })
})

describe('ExamEventController permissions', () => {
  it.each(Object.entries(eventRoutes))('%s requires %j', (method, codes) => {
    const handler = ExamEventController.prototype[
      method as keyof ExamEventController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it.each(Object.entries(eventAnyRoutes))(
    '%s accepts any of %j so a supervisor reaches the event',
    (method, codes) => {
      const handler = ExamEventController.prototype[
        method as keyof ExamEventController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
    },
  )

  it('leaves no event route without a permission', () => {
    expect(handlers(ExamEventController.prototype).sort()).toEqual(
      [...Object.keys(eventRoutes), ...Object.keys(eventAnyRoutes)].sort(),
    )
  })
})

describe('ExamEventController print pack', () => {
  const pack: PrintPack = {
    event: {
      id: UUID_A,
      name: 'UTS Ganjil',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
    },
    rooms: [
      {
        id: UUID_B,
        code: 'R01',
        name: 'Ruang 01',
        building: null,
        technician: null,
        supervisors: [
          {
            startsAt: new Date('2026-11-02T01:00:00.000Z'),
            endsAt: new Date('2026-11-02T04:00:00.000Z'),
            name: null,
          },
        ],
        students: [
          {
            seatNumber: 1,
            studentId: UUID_A,
            name: null,
            nis: '1234',
            classroomName: 'VII A',
            participantNumber: null,
          },
        ],
      },
    ],
    warnings: ['1 peserta belum punya nomor peserta'],
  }

  function build() {
    const calls: [string, string | undefined][] = []
    const printPack = {
      execute: (eventId: string, roomId?: string) => {
        calls.push([eventId, roomId])
        return Promise.resolve(pack)
      },
    } as never
    const controller = new ExamEventController(
      undefined as never,
      undefined as never,
      printPack,
      undefined as never,
      undefined as never,
      undefined as never,
    )
    return { calls, controller }
  }

  it('returns the pack as an ISO-dated DTO and passes the event and room on', async () => {
    const { calls, controller } = build()
    const query = Object.assign(new PrintPackQueryDto(), { roomId: UUID_B })

    const result = await controller.getPrintPack(UUID_A, query)

    expect(calls).toEqual([[UUID_A, UUID_B]])
    expect(result).toBeInstanceOf(PrintPackDto)
    expect(result.event.startsAt).toBe('2026-11-02T01:00:00.000Z')
    expect(result.rooms[0].supervisors[0].endsAt).toBe(
      '2026-11-02T04:00:00.000Z',
    )
    expect(result.rooms[0].students[0].participantNumber).toBeNull()
    expect(result.warnings).toEqual(pack.warnings)
  })

  it('passes no room when the query omits roomId', async () => {
    const { calls, controller } = build()

    await controller.getPrintPack(UUID_A, new PrintPackQueryDto())

    expect(calls).toEqual([[UUID_A, undefined]])
  })

  it('answers 400 for an event id that is not a uuid', async () => {
    const pipe = new ParseUUIDPipe()

    await expect(
      pipe.transform('not-a-uuid', { type: 'param', data: 'id' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('answers 400 for a room id that is not a uuid', async () => {
    const dto = plainToInstance(PrintPackQueryDto, { roomId: 'not-a-uuid' })

    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('accepts a query with a uuid room id', async () => {
    const dto = plainToInstance(PrintPackQueryDto, { roomId: UUID_B })

    expect(await validate(dto)).toHaveLength(0)
  })
})

describe('PrintPackDto contract', () => {
  it('lists the event, rooms and warnings as required', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExamEventController],
      providers: [
        { provide: ManageExamEventsUseCase, useValue: {} },
        { provide: ManageExamRoomsUseCase, useValue: {} },
        { provide: GetPrintPackUseCase, useValue: {} },
        { provide: ResetEventCredentialsUseCase, useValue: {} },
        { provide: GenerateSeatsUseCase, useValue: {} },
        { provide: GenerateRoomSlotsUseCase, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()
    const app = moduleRef.createNestApplication()
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )
    await app.close()

    expect(document.components?.schemas?.PrintPackDto).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining(['event', 'rooms', 'warnings']),
      }),
    )
  })
})

describe('ExamRoomController seat batch', () => {
  function build() {
    const rooms = new FakeExamRoomRepository()
    return { rooms, manage: new ManageExamRoomsUseCase(rooms) }
  }

  it('refuses a batch that shares one seat number and leaves the room empty', async () => {
    const { rooms, manage } = build()
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })
    const controller = new ExamRoomController(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      manage,
      undefined as never,
      rooms,
      new RoomAccessService(rooms),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )
    rooms.rooms.set(room.id, room)

    await expect(
      controller.assignSeat(room.id, {
        students: [
          { studentId: 'student-1', classroomId: 'class-1', seatNumber: 1 },
          { studentId: 'student-2', classroomId: 'class-1', seatNumber: 1 },
        ],
      }),
    ).rejects.toThrow(ConflictException)
    expect(await rooms.listSeatsByRoom(room.id)).toEqual([])
  })

  it('seats a clean batch in one call', async () => {
    const { rooms, manage } = build()
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })
    const controller = new ExamRoomController(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      manage,
      undefined as never,
      rooms,
      new RoomAccessService(rooms),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )

    const created = await controller.assignSeat(room.id, {
      students: [
        { studentId: 'student-1', classroomId: 'class-1', seatNumber: 1 },
        { studentId: 'student-2', classroomId: 'class-1', seatNumber: 2 },
      ],
    })

    expect(created.map((row) => row.seatNumber)).toEqual([1, 2])
    expect(await rooms.listSeatsByRoom(room.id)).toHaveLength(2)
  })
})

describe('AssignSeatsDto validation', () => {
  const parse = (body: Record<string, unknown>): AssignSeatsDto =>
    plainToInstance(AssignSeatsDto, body)

  it('accepts a real seat body and keeps every field', async () => {
    const dto = parse({
      students: [{ studentId: UUID_A, classroomId: UUID_B, seatNumber: 1 }],
    })

    expect(await validate(dto)).toHaveLength(0)
    expect(dto.students[0]).toBeInstanceOf(ExamRoomSeatDto)
    expect(dto.students[0].studentId).toBe(UUID_A)
    expect(dto.students[0].classroomId).toBe(UUID_B)
    expect(dto.students[0].seatNumber).toBe(1)
  })

  it('lets the seat number be omitted so the index can fill it', async () => {
    const dto = parse({
      students: [{ studentId: UUID_A, classroomId: UUID_B }],
    })

    expect(await validate(dto)).toHaveLength(0)
    expect(dto.students[0].seatNumber).toBeUndefined()
  })

  it('rejects a seat without its classroom', async () => {
    const dto = parse({ students: [{ studentId: UUID_A }] })

    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('rejects a non-uuid student', async () => {
    const dto = parse({
      students: [{ studentId: 'student-1', classroomId: UUID_B }],
    })

    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('rejects an unknown key instead of silently dropping it', async () => {
    const errors = await validate(
      parse({
        students: [
          {
            studentId: UUID_A,
            classroomId: UUID_B,
            seatNumber: 1,
            roomId: 'x',
          },
        ],
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    )

    expect(errors).not.toHaveLength(0)
  })
})

describe('ExamRoomController capacity and bulk distribution', () => {
  async function build() {
    const rooms = new FakeExamRoomRepository()
    const manage = new ManageExamRoomsUseCase(rooms)
    const controller = new ExamRoomController(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      manage,
      undefined as never,
      rooms,
      new RoomAccessService(rooms),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    return { rooms, manage, controller, event }
  }

  it('refuses manual seats past the room capacity', async () => {
    const { rooms, controller, event } = await build()
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 1,
    })

    await expect(
      controller.assignSeat(room.id, {
        students: [
          { studentId: 'student-1', classroomId: 'class-1', seatNumber: 1 },
          { studentId: 'student-2', classroomId: 'class-1', seatNumber: 2 },
        ],
      }),
    ).rejects.toThrow(ConflictException)
    expect(await rooms.listSeatsByRoom(room.id)).toEqual([])
  })

  it('auto distributes when roomIds are given', async () => {
    const { rooms, controller, event } = await build()
    const first = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 2,
    })
    const second = await rooms.createRoom({
      eventId: event.id,
      code: 'R02',
      name: 'Ruang 02',
      capacity: 2,
    })

    const created = await controller.assignSeat(first.id, {
      students: [
        { studentId: 'student-1', classroomId: 'class-1' },
        { studentId: 'student-2', classroomId: 'class-1' },
        { studentId: 'student-3', classroomId: 'class-1' },
      ],
      roomIds: [first.id, second.id],
    })

    expect(created).toHaveLength(3)
    expect(await rooms.listSeatsByRoom(first.id)).toHaveLength(2)
    expect(await rooms.listSeatsByRoom(second.id)).toHaveLength(1)
  })
})

describe('ExamRoomController supervisor slots', () => {
  it('records an assigned supervisor and the audit row', async () => {
    const rooms = new FakeExamRoomRepository()
    const manage = new ManageExamRoomsUseCase(rooms)
    const assign = new AssignSupervisorUseCase(rooms)
    const controller = new ExamRoomController(
      undefined as never,
      assign,
      undefined as never,
      undefined as never,
      undefined as never,
      manage,
      undefined as never,
      rooms,
      new RoomAccessService(rooms),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })

    const slot = await controller.assignSupervisor({ id: 'admin-1' }, room.id, {
      scheduledUserId: UUID_A,
      startsAt: '2026-11-02T01:00:00.000Z',
      endsAt: '2026-11-02T03:00:00.000Z',
      reason: 'Jadwal pengawas pagi',
    })

    expect(slot.roomId).toBe(room.id)
    expect(
      await rooms.findSupervisorAt(room.id, new Date('2026-11-02T02:00:00Z')),
    ).not.toBeNull()
    const audit = await rooms.listAuditLogsByRoom(room.id)
    expect(audit[0]).toMatchObject({
      action: 'ASSIGN_SUPERVISOR',
      reason: 'Jadwal pengawas pagi',
    })
  })

  it('refuses a slot that ends before it starts', async () => {
    const rooms = new FakeExamRoomRepository()
    const assign = new AssignSupervisorUseCase(rooms)
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })

    await expect(
      assign.execute(
        { id: 'admin-1' },
        {
          roomId: room.id,
          scheduledUserId: UUID_A,
          startsAt: new Date('2026-11-02T03:00:00.000Z'),
          endsAt: new Date('2026-11-02T02:00:00.000Z'),
          reason: 'Jadwal salah',
        },
      ),
    ).rejects.toThrow(ConflictException)
  })
})

describe('ManageExamRoomsUseCase rotate token audit', () => {
  it('writes a ROTATE_ROOM_TOKEN row with the room and no session', async () => {
    const rooms = new FakeExamRoomRepository()
    const manage = new ManageExamRoomsUseCase(rooms)
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })

    const rotated = await manage.rotateToken(
      room.id,
      { id: 'tech-1', permissions: ['exam-rooms.technician'] },
      'Token bocor ke siswa lain',
    )

    expect(rotated.tokenRotation).toBe(1)
    const audit = await rooms.listAuditLogsByRoom(room.id)
    expect(audit[0]).toMatchObject({
      action: 'ROTATE_ROOM_TOKEN',
      roomId: room.id,
      sessionId: null,
      reason: 'Token bocor ke siswa lain',
    })
  })
})

describe('ExamEventController supervised listing', () => {
  async function build() {
    const rooms = new FakeExamRoomRepository()
    const events = new ManageExamEventsUseCase(rooms)
    const manageRooms = new ManageExamRoomsUseCase(rooms)
    const controller = new ExamEventController(
      events,
      manageRooms,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )
    const mine = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const other = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Genap',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-03T01:00:00.000Z'),
      endsAt: new Date('2026-11-03T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: mine.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })
    return { controller, mine, other, rooms, room }
  }

  it('returns every event to a reader and only supervised events to a supervisor', async () => {
    const { controller, mine, other, rooms, room } = await build()
    await rooms.assignSupervisor({
      roomId: room.id,
      startsAt: new Date('2020-01-01T00:00:00.000Z'),
      endsAt: new Date('2030-01-01T00:00:00.000Z'),
      scheduledUserId: UUID_A,
    })

    const all = await controller.list(
      { id: 'reader', permissions: ['exam-events.read'] },
      { page: 1, limit: 10 },
    )
    expect(all.total).toBe(2)

    const scoped = await controller.list(
      { id: UUID_A, permissions: ['exam-rooms.supervise'] },
      { page: 1, limit: 10 },
    )
    expect(scoped.data.map((row) => row.id)).toEqual([mine.id])
    expect(scoped.data.map((row) => row.id)).not.toContain(other.id)
  })

  it('keeps an event whose supervisor slot only starts tomorrow', async () => {
    const { controller, mine, rooms, room } = await build()
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await rooms.assignSupervisor({
      roomId: room.id,
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000),
      scheduledUserId: UUID_A,
    })

    const scoped = await controller.list(
      { id: UUID_A, permissions: ['exam-rooms.supervise'] },
      { page: 1, limit: 10 },
    )

    expect(scoped.data.map((row) => row.id)).toEqual([mine.id])
  })

  it('scopes list, findOne, and roomsOfEvent to technician rooms while letting read-all see all', async () => {
    const { controller, mine, other, rooms } = await build()
    const techRoom = await rooms.createRoom({
      eventId: mine.id,
      code: 'R02',
      name: 'Ruang Tech',
      capacity: 30,
      technicianUserId: 'tech-1',
    })
    const otherRoom = await rooms.createRoom({
      eventId: other.id,
      code: 'R03',
      name: 'Ruang Lain',
      capacity: 30,
      technicianUserId: 'tech-2',
    })
    const techUser = { id: 'tech-1', permissions: ['exam-rooms.technician'] }
    const readerUser = {
      id: 'principal-1',
      permissions: ['exam-rooms.read-all'],
    }

    const techList = await controller.list(techUser, { page: 1, limit: 10 })
    expect(techList.data.map((row) => row.id)).toEqual([mine.id])

    const readerList = await controller.list(readerUser, { page: 1, limit: 10 })
    expect(readerList.data.map((row) => row.id)).toEqual([mine.id, other.id])

    await expect(controller.findOne(techUser, mine.id)).resolves.toMatchObject({
      id: mine.id,
    })
    await expect(controller.findOne(techUser, other.id)).rejects.toThrow()
    await expect(
      controller.findOne(readerUser, other.id),
    ).resolves.toMatchObject({ id: other.id })

    const techRooms = await controller.roomsOfEvent(techUser, mine.id)
    expect(techRooms.map((row) => row.id)).toEqual([techRoom.id])
    await expect(controller.roomsOfEvent(techUser, other.id)).rejects.toThrow()

    const readerRooms = await controller.roomsOfEvent(readerUser, other.id)
    expect(readerRooms.map((row) => row.id)).toEqual([otherRoom.id])

    const managerUser = {
      id: 'manager-1',
      permissions: ['exam-rooms.manage-all'],
    }
    const managerList = await controller.list(managerUser, {
      page: 1,
      limit: 10,
    })
    expect(managerList.data.map((row) => row.id)).toEqual([mine.id, other.id])
    await expect(
      controller.findOne(managerUser, other.id),
    ).resolves.toMatchObject({ id: other.id })
    const managerRooms = await controller.roomsOfEvent(managerUser, other.id)
    expect(managerRooms.map((row) => row.id)).toEqual([otherRoom.id])
  })

  it('returns all events on list for grading permissions while still denying findOne and roomsOfEvent', async () => {
    const { controller, mine, other } = await build()
    for (const code of [
      'exam-grading.read',
      'exam-grading.read-all',
      'exam-grading.manage-all',
    ]) {
      const user = { id: `grader-${code}`, permissions: [code] }
      const listed = await controller.list(user, { page: 1, limit: 10 })
      expect(listed.data.map((row) => row.id)).toEqual([mine.id, other.id])
      await expect(controller.findOne(user, mine.id)).rejects.toThrow()
      await expect(controller.roomsOfEvent(user, mine.id)).rejects.toThrow()
    }
  })
})

describe('ExamRoomController accessCode scoping', () => {
  it('lets read-all and assigned technician read access-code while rejecting unassigned technician', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
      technicianUserId: 'tech-1',
    })
    const controller = new ExamRoomController(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      new ManageExamRoomsUseCase(rooms),
      new RoomAccessCodeService('unit-test-secret-of-at-least-32-characters'),
      rooms,
      new RoomAccessService(rooms),
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    )

    await expect(
      controller.accessCode(
        { id: 'principal-1', permissions: ['exam-rooms.read-all'] },
        room.id,
      ),
    ).resolves.toMatchObject({
      accessCode: expect.stringMatching(/^[A-Z0-9]{6}$/),
      rotation: 0,
    })
    await expect(
      controller.accessCode(
        { id: 'tech-1', permissions: ['exam-rooms.technician'] },
        room.id,
      ),
    ).resolves.toMatchObject({
      accessCode: expect.stringMatching(/^[A-Z0-9]{6}$/),
      rotation: 0,
    })
    await expect(
      controller.accessCode(
        { id: 'tech-2', permissions: ['exam-rooms.technician'] },
        room.id,
      ),
    ).rejects.toMatchObject({ response: { code: 'ROOM_FORBIDDEN' } })
  })
})

describe('ExamEventController credentials reset', () => {
  it('rejects a body without confirm: true', async () => {
    const body = (confirm: unknown) =>
      validate(plainToInstance(ResetCredentialsBodyDto, { confirm }))

    expect(await body(true)).toHaveLength(0)
    expect(await body(false)).not.toHaveLength(0)
    expect(await body(undefined)).not.toHaveLength(0)
    expect(await body('true')).not.toHaveLength(0)
  })

  it('passes the event, room and actor on and answers the items and skipped', async () => {
    const calls: unknown[][] = []
    const reset = {
      execute: (...args: unknown[]) => {
        calls.push(args)
        return Promise.resolve({
          items: [
            { studentId: UUID_A, identifier: 'nis-1', password: 'Abcdefghjk' },
          ],
          skipped: [UUID_B],
        })
      },
    } as never
    const controller = new ExamEventController(
      undefined as never,
      undefined as never,
      undefined as never,
      reset,
      undefined as never,
      undefined as never,
    )
    const query = Object.assign(new PrintPackQueryDto(), { roomId: UUID_B })

    const result = await controller.resetPasswords(
      { id: 'admin-1' },
      UUID_A,
      query,
      { confirm: true },
    )

    expect(calls).toEqual([[UUID_A, 'admin-1', UUID_B]])
    expect(result).toEqual({
      items: [
        { studentId: UUID_A, identifier: 'nis-1', password: 'Abcdefghjk' },
      ],
      skipped: [UUID_B],
    })
  })
})

describe('GenerateSeatsBodyDto', () => {
  const student = { studentId: UUID_A, classroomId: UUID_B }

  it('accepts up to 1000 students', async () => {
    const dto = plainToInstance(GenerateSeatsBodyDto, {
      mode: 'preview',
      students: Array.from({ length: 1000 }, () => student),
    })

    expect(await validate(dto)).toHaveLength(0)
  })

  it('rejects more than 1000 students', async () => {
    const dto = plainToInstance(GenerateSeatsBodyDto, {
      mode: 'preview',
      students: Array.from({ length: 1001 }, () => student),
    })

    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('rejects more than 10 lanes per side', async () => {
    const dto = plainToInstance(GenerateSeatsBodyDto, {
      mode: 'preview',
      students: [],
      rules: { lanesPerSide: 11 },
    })

    expect(await validate(dto)).not.toHaveLength(0)
  })

  it('rejects an unknown mode', async () => {
    const dto = plainToInstance(GenerateSeatsBodyDto, {
      mode: 'print',
      students: [],
    })

    expect(await validate(dto)).not.toHaveLength(0)
  })
})
