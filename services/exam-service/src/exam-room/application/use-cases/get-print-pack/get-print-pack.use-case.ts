import { Injectable, NotFoundException } from '@nestjs/common'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IAuthorLookupPort } from '../../../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import type { ExamRoomSeat } from '../../../domain/entities/exam-room-seat.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

export interface PrintPackStudent {
  seatNumber: number
  studentId: string
  name: string | null
  nis: string | null
  classroomName: string | null
  participantNumber: string | null
}

export interface PrintPackRoom {
  id: string
  code: string
  name: string
  building: string | null
  technician: { name: string | null } | null
  supervisors: { startsAt: Date; endsAt: Date; name: string | null }[]
  students: PrintPackStudent[]
}

export interface PrintPack {
  event: { id: string; name: string; startsAt: Date; endsAt: Date }
  rooms: PrintPackRoom[]
  warnings: string[]
}

@Injectable()
export class GetPrintPackUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly academic: IAcademicLookupPort,
    private readonly participants: IParticipantNumberPort,
    private readonly authors: IAuthorLookupPort,
    private readonly employees: IEmployeeIdentityReadPort,
  ) {}

  async execute(eventId: string, roomId?: string): Promise<PrintPack> {
    const event = await this.rooms.findEventById(eventId)
    if (event === null)
      throw new NotFoundException('Acara ujian tidak ditemukan')
    let rooms = await this.rooms.listRoomsByEvent(eventId)
    if (roomId !== undefined) {
      rooms = rooms.filter((room) => room.id === roomId)
      if (rooms.length === 0)
        throw new NotFoundException('Ruang tidak ditemukan')
    }
    rooms = [...rooms].sort((a, b) => a.code.localeCompare(b.code))
    const roomIds = new Set(rooms.map((room) => room.id))

    const seatsOf = new Map<string, ExamRoomSeat[]>()
    for (const seat of await this.rooms.listSeatsByEvent(eventId)) {
      if (!roomIds.has(seat.roomId)) continue
      const held = seatsOf.get(seat.roomId) ?? []
      held.push(seat)
      seatsOf.set(seat.roomId, held)
    }
    const seats = [...seatsOf.values()].flat()
    const studentIds = [...new Set(seats.map((seat) => seat.studentId))]

    const supervisorsOf = new Map(
      await Promise.all(
        rooms.map(
          async (room) =>
            [
              room.id,
              (await this.rooms.listSupervisors(room.id)).sort(
                (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
              ),
            ] as const,
        ),
      ),
    )

    const refs = new Map<string, { name: string | null; nis: string }>()
    const classroomNames = new Map<string, string | null>()
    let numbers = new Map<string, string>()
    if (seats.length > 0) {
      for (const ref of await this.students.refsByIds(studentIds)) {
        refs.set(ref.id, ref)
      }
      const classrooms = await this.academic.classroomsByIds([
        ...new Set(seats.map((seat) => seat.classroomId)),
      ])
      for (const row of classrooms) classroomNames.set(row.id, row.name)
      numbers = await this.participants.findNumbers(
        studentIds,
        event.semesterId,
      )
    }

    const userIds = new Set<string>()
    for (const room of rooms) {
      if (room.technicianUserId !== null) userIds.add(room.technicianUserId)
      for (const slot of supervisorsOf.get(room.id) ?? []) {
        userIds.add(slot.actualUserId)
      }
    }
    const nameOfUser = await this.namesOfUsers([...userIds])

    let missing = 0
    const result = rooms.map((room): PrintPackRoom => {
      const students = [...(seatsOf.get(room.id) ?? [])]
        .sort((a, b) => a.seatNumber - b.seatNumber)
        .map((seat): PrintPackStudent => {
          const ref = refs.get(seat.studentId)
          const participantNumber = numbers.get(seat.studentId) ?? null
          if (participantNumber === null) missing += 1
          return {
            seatNumber: seat.seatNumber,
            studentId: seat.studentId,
            name: ref?.name ?? null,
            nis: ref?.nis ?? null,
            classroomName: classroomNames.get(seat.classroomId) ?? null,
            participantNumber,
          }
        })
      return {
        id: room.id,
        code: room.code,
        name: room.name,
        building: room.building,
        technician:
          room.technicianUserId === null
            ? null
            : { name: nameOfUser.get(room.technicianUserId) ?? null },
        supervisors: (supervisorsOf.get(room.id) ?? []).map((slot) => ({
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          name: nameOfUser.get(slot.actualUserId) ?? null,
        })),
        students,
      }
    })

    return {
      event: {
        id: event.id,
        name: event.name,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      },
      rooms: result,
      warnings: missing > 0 ? [`${missing} siswa belum bernomor peserta`] : [],
    }
  }

  private async namesOfUsers(userIds: string[]): Promise<Map<string, string>> {
    const employeeOf = new Map<string, string>()
    for (const userId of userIds) {
      const employeeId = await this.employees.findEmployeeIdByUserId(userId)
      if (employeeId !== null) employeeOf.set(userId, employeeId)
    }
    if (employeeOf.size === 0) return new Map()
    const names = await this.authors.namesOf([...employeeOf.values()])
    const result = new Map<string, string>()
    for (const [userId, employeeId] of employeeOf) {
      const name = names.get(employeeId)
      if (name !== undefined) result.set(userId, name)
    }
    return result
  }
}
