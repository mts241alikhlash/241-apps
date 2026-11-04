import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import type { ExamRoomSupervisor } from '../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../domain/repositories/exam-room.repository.js'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from './room-access.service.js'

const NOW = new Date('2026-11-02T02:00:00.000Z')
const ROOM_A = '11111111-1111-4111-8111-111111111111'
const ROOM_B = '22222222-2222-4222-8222-222222222222'

const TECHNICIAN_A: RoomStaffUser = {
  id: 'tech-a',
  permissions: [TECHNICIAN],
}
const SUPERVISOR_A: RoomStaffUser = {
  id: 'sup-a',
  permissions: [SUPERVISE],
}
const ADMIN: RoomStaffUser = { id: 'admin-1', permissions: [MANAGE_ALL] }

class StubRooms extends IExamRoomRepository {
  readonly rooms = new Map<string, ExamRoom>()
  readonly slots: ExamRoomSupervisor[] = []

  createEvent = jest.fn()
  updateEvent = jest.fn()
  findEventById = jest.fn()
  listEvents = jest.fn()
  listEventIdsSupervisedBy = jest.fn()
  createRoom = jest.fn()
  listRoomsByEvent = jest.fn()
  listRoomsByEventStatus = jest.fn()
  listRoomsByTechnician = jest.fn()
  listRoomsSupervisedBy = jest.fn()
  findSupervisorById = jest.fn()
  listAbsencesByReport = jest.fn()
  listFieldNotesByReport = jest.fn()
  reopenReport = jest.fn()
  listLatestSessionEvents = jest.fn()
  updateRoom = jest.fn()
  assignSeat = jest.fn()
  assignSeats = jest.fn()
  findSeat = jest.fn()
  listSeatsByRoom = jest.fn()
  listSeatsByEvent = jest.fn()
  removeSeat = jest.fn()
  setSeatFlags = jest.fn()
  setSeatFlagsWithAudit = jest.fn()
  autoDistributeSeats = jest.fn()
  assignSupervisor = jest.fn()
  listSupervisors = jest.fn()
  substituteSupervisor = jest.fn()
  rotateRoomToken = jest.fn()
  recordSessionEvents = jest.fn()
  listSessionEvents = jest.fn()
  writeAuditLog = jest.fn()
  listAuditLogs = jest.fn()
  listAuditLogsByRoom = jest.fn()
  findReportBySlot = jest.fn()
  createReport = jest.fn()
  saveReportDraft = jest.fn()
  recordAbsence = jest.fn()
  recordFieldNote = jest.fn()
  submitReport = jest.fn()
  verifyReport = jest.fn()
  listAbsencesByScheduleStudent = jest.fn()
  listAbsencesByScheduleStudents = jest.fn()

  findRoomById(id: string) {
    return Promise.resolve(this.rooms.get(id) ?? null)
  }

  findSupervisorAt(roomId: string, at: Date) {
    const found = this.slots.find(
      (slot) =>
        slot.roomId === roomId &&
        slot.startsAt.getTime() <= at.getTime() &&
        slot.endsAt.getTime() > at.getTime(),
    )
    return Promise.resolve(found ?? null)
  }

  findSupervisorSlotForUser(roomId: string, userId: string, at: Date) {
    const found = this.slots.find(
      (slot) =>
        slot.roomId === roomId &&
        slot.actualUserId === userId &&
        slot.startsAt.getTime() <= at.getTime() &&
        slot.endsAt.getTime() > at.getTime(),
    )
    return Promise.resolve(found ?? null)
  }
}

function room(id: string, technicianUserId: string | null): ExamRoom {
  return {
    id,
    eventId: 'event-1',
    code: id === ROOM_A ? 'R01' : 'R02',
    name: id === ROOM_A ? 'Ruang 01' : 'Ruang 02',
    building: null,
    capacity: 30,
    technicianUserId,
    tokenRotation: 0,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function setup() {
  const rooms = new StubRooms()
  rooms.rooms.set(ROOM_A, room(ROOM_A, TECHNICIAN_A.id))
  rooms.rooms.set(ROOM_B, room(ROOM_B, 'tech-b'))
  rooms.slots.push({
    id: 'slot-a',
    roomId: ROOM_A,
    startsAt: new Date('2026-11-02T01:00:00.000Z'),
    endsAt: new Date('2026-11-02T03:00:00.000Z'),
    scheduledUserId: SUPERVISOR_A.id,
    actualUserId: SUPERVISOR_A.id,
    substitutedByAdminId: null,
    substituteReason: null,
    substitutedAt: null,
    createdAt: NOW,
  })
  return { rooms, access: new RoomAccessService(rooms) }
}

describe('RoomAccessService', () => {
  it('lets the technician of room A act on room A only', async () => {
    const { access } = setup()

    await expect(
      access.assertCanActAsTechnician(TECHNICIAN_A, ROOM_A),
    ).resolves.toMatchObject({ id: ROOM_A })
    await expect(
      access.assertCanActAsTechnician(TECHNICIAN_A, ROOM_B),
    ).rejects.toThrow(ForbiddenException)
  })

  it('refuses a technician of another room the reopen, reset and extend actions', async () => {
    const { access } = setup()
    const actions = [
      () => access.assertCanActAsTechnician(TECHNICIAN_A, ROOM_B),
      () => access.assertCanRelease(TECHNICIAN_A, ROOM_B, NOW),
      () => access.assertCanSupervise(TECHNICIAN_A, ROOM_B, NOW),
    ]

    for (const action of actions) {
      await expect(action()).rejects.toThrow(ForbiddenException)
    }
  })

  it('lets a supervisor of room A supervise and release, but never act as technician', async () => {
    const { access } = setup()

    await expect(
      access.assertCanSupervise(SUPERVISOR_A, ROOM_A, NOW),
    ).resolves.toMatchObject({ id: ROOM_A })
    await expect(
      access.assertCanRelease(SUPERVISOR_A, ROOM_A, NOW),
    ).resolves.toMatchObject({ id: ROOM_A })

    await expect(
      access.assertCanActAsTechnician(SUPERVISOR_A, ROOM_A),
    ).rejects.toThrow(ForbiddenException)
  })

  it('refuses a supervisor outside their slot window and in another room', async () => {
    const { access } = setup()

    await expect(
      access.assertCanSupervise(
        SUPERVISOR_A,
        ROOM_A,
        new Date('2026-11-02T05:00:00.000Z'),
      ),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      access.assertCanSupervise(SUPERVISOR_A, ROOM_B, NOW),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      access.assertCanRelease(SUPERVISOR_A, ROOM_B, NOW),
    ).rejects.toThrow(ForbiddenException)
  })

  it('bypasses the room scope for exam-rooms.manage-all', async () => {
    const { access } = setup()

    await expect(
      access.assertCanActAsTechnician(ADMIN, ROOM_B),
    ).resolves.toMatchObject({ id: ROOM_B })
    await expect(
      access.assertCanSupervise(ADMIN, ROOM_B, NOW),
    ).resolves.toMatchObject({ id: ROOM_B })
    await expect(
      access.assertCanRelease(ADMIN, ROOM_B, NOW),
    ).resolves.toMatchObject({ id: ROOM_B })
    await expect(access.assertCanActWithoutRoom(ADMIN)).resolves.toBeUndefined()
  })

  it('refuses a user with no exam-room permission at all', async () => {
    const { access } = setup()
    const outsider: RoomStaffUser = { id: 'nobody', permissions: [] }

    await expect(
      access.assertCanActAsTechnician(outsider, ROOM_A),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      access.assertCanSupervise(outsider, ROOM_A, NOW),
    ).rejects.toThrow(ForbiddenException)
    await expect(access.assertCanActWithoutRoom(outsider)).rejects.toThrow(
      ForbiddenException,
    )
  })

  it('answers 404 for an unknown room', async () => {
    const { access } = setup()

    await expect(
      access.assertCanActAsTechnician(
        ADMIN,
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(NotFoundException)
  })
})
