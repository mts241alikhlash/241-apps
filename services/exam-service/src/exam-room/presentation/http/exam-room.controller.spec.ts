import 'reflect-metadata'
import { ConflictException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { PERMISSIONS_ANY_KEY } from '@mts241alikhlash/nest-core/access-control'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { FakeExamRoomRepository } from '../../application/exam-room.repository.fake.js'
import { AssignSupervisorUseCase } from '../../application/use-cases/assign-supervisor/assign-supervisor.use-case.js'
import { ManageExamEventsUseCase } from '../../application/use-cases/manage-exam-events/manage-exam-events.use-case.js'
import { ManageExamRoomsUseCase } from '../../application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import { RoomAccessService } from '../../application/room-access.service.js'
import { ExamRoomController } from './exam-room.controller.js'
import { ExamEventController } from './exam-event.controller.js'
import { AssignSeatsDto, ExamRoomSeatDto } from './dto/exam-room.dto.js'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

const roomRoutes: Record<string, string[]> = {
  accessCode: ['exam-rooms.supervise'],
  rotateToken: ['exam-rooms.technician'],
  update: ['exam-events.manage'],
  auditLogs: ['exam-rooms.supervise'],
  seats: ['exam-rooms.supervise'],
  assignSeat: ['exam-events.manage'],
  supervisors: ['exam-rooms.supervise'],
  assignSupervisor: ['exam-events.manage'],
  substitute: ['exam-rooms.technician'],
  allowWebClient: ['exam-rooms.technician'],
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
}

const roomAnyRoutes: Record<string, string[]> = {
  accessCode: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  rotateToken: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  auditLogs: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  seats: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  supervisors: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  substitute: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  allowWebClient: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  allowLateEntry: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  extendTime: ['exam-rooms.technician', 'exam-rooms.manage-all'],
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
}

const eventRoutes: Record<string, string[]> = {
  create: ['exam-events.manage'],
  update: ['exam-events.manage'],
  createRoom: ['exam-events.manage'],
}

const eventAnyRoutes: Record<string, string[]> = {
  list: ['exam-events.read', 'exam-rooms.supervise'],
  findOne: ['exam-events.read', 'exam-rooms.supervise'],
  roomsOfEvent: ['exam-events.read', 'exam-rooms.supervise'],
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
      type: 'UTS',
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
      type: 'UTS',
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
      type: 'UTS',
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
      type: 'UTS',
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

    const slot = await controller.assignSupervisor(
      { id: 'admin-1', permissions: ['exam-events.manage'] },
      room.id,
      {
        scheduledUserId: UUID_A,
        startsAt: '2026-11-02T01:00:00.000Z',
        endsAt: '2026-11-02T03:00:00.000Z',
        reason: 'Jadwal pengawas pagi',
      },
    )

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
      type: 'UTS',
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
        { id: 'admin-1', permissions: ['exam-events.manage'] },
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
      type: 'UTS',
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
    const controller = new ExamEventController(events, undefined as never)
    const mine = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Ganjil',
      type: 'UTS',
      startsAt: new Date('2026-11-02T01:00:00.000Z'),
      endsAt: new Date('2026-11-02T04:00:00.000Z'),
      createdById: 'admin-1',
    })
    const other = await rooms.createEvent({
      semesterId: 'sem-1',
      name: 'UTS Genap',
      type: 'UTS',
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
})
