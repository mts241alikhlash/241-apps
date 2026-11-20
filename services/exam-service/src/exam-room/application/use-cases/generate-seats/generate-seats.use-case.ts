import { Injectable, NotFoundException } from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import {
  DEFAULT_SEAT_RULES,
  generateSeatPlanWithLayouts,
  type PlanStudent,
  type SeatPlan,
  type SeatRules,
} from '../../../domain/policies/seat-generate.policy.js'
import { type SeatLayout } from '../../../domain/policies/seat-layout.policy.js'

export interface GenerateSeatsCommand {
  eventId: string
  mode: 'preview' | 'apply'
  replaceExisting: boolean
  students: { studentId: string; classroomId: string }[]
  roomIds?: string[]
  rules: Partial<Omit<SeatRules, 'seed'>> & { seed?: string }
}

export interface GenerateSeatsResult {
  plan: SeatPlan
  rooms: {
    roomId: string
    code: string
    capacity: number
    layout: SeatLayout
  }[]
  applied: boolean
}

@Injectable()
export class GenerateSeatsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly academic: IAcademicLookupPort,
  ) {}

  async execute(command: GenerateSeatsCommand): Promise<GenerateSeatsResult> {
    const event = await this.rooms.findEventById(command.eventId)
    if (event === null) {
      throw new NotFoundException('Acara ujian tidak ditemukan')
    }
    const all = await this.rooms.listRoomsByEvent(command.eventId)
    const picked = command.roomIds
      ? all.filter((room) => command.roomIds?.includes(room.id))
      : all
    if (picked.length === 0) {
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    }
    const pickedIds = picked.map((room) => room.id)

    const heldElsewhere = new Set(
      (await this.rooms.listSeatsByEvent(command.eventId))
        .filter((seat) => !pickedIds.includes(seat.roomId))
        .map((seat) => seat.studentId),
    )
    const refs = new Map(
      (
        await this.students.refsByIds(
          command.students.map((student) => student.studentId),
        )
      ).map((ref) => [ref.id, ref]),
    )
    const classrooms = await this.academic.classroomsByIds([
      ...new Set(command.students.map((student) => student.classroomId)),
    ])
    const gradeOf = new Map(
      classrooms.map((classroom) => [classroom.id, classroom.gradeId]),
    )
    const grades = await this.academic.gradesByIds([
      ...new Set(classrooms.map((classroom) => classroom.gradeId)),
    ])
    const levelOf = new Map(grades.map((grade) => [grade.id, grade.level]))

    const students: PlanStudent[] = []
    const unplaceable: PlanStudent[] = []
    for (const student of command.students) {
      const ref = refs.get(student.studentId)
      const gradeId = gradeOf.get(student.classroomId)
      const gradeLevel =
        gradeId === undefined ? undefined : levelOf.get(gradeId)
      const entry: PlanStudent = {
        studentId: student.studentId,
        classroomId: student.classroomId,
        gradeLevel: gradeLevel ?? 0,
        gender: ref?.gender ?? null,
        name: ref?.name ?? '',
      }
      if (
        ref === undefined ||
        gradeLevel === undefined ||
        heldElsewhere.has(student.studentId)
      ) {
        unplaceable.push(entry)
      } else {
        students.push(entry)
      }
    }

    const requested = command.rules
    const rules: SeatRules = {
      order: requested.order ?? DEFAULT_SEAT_RULES.order,
      separateGender:
        requested.separateGender ?? DEFAULT_SEAT_RULES.separateGender,
      spreadGrades: requested.spreadGrades ?? DEFAULT_SEAT_RULES.spreadGrades,
      spreadClassrooms:
        requested.spreadClassrooms ?? DEFAULT_SEAT_RULES.spreadClassrooms,
      lanesPerSide: requested.lanesPerSide ?? DEFAULT_SEAT_RULES.lanesPerSide,
      seed: requested.seed ?? command.eventId,
    }
    const { plan: generated, layouts } = generateSeatPlanWithLayouts(
      students,
      picked.map((room) => ({
        roomId: room.id,
        code: room.code,
        capacity: room.capacity,
      })),
      rules,
    )
    const plan: SeatPlan = {
      ...generated,
      unseated: [...generated.unseated, ...unplaceable],
    }

    let applied = false
    if (command.mode === 'apply') {
      if (
        !command.replaceExisting &&
        (await this.rooms.countSeatsByEvent(command.eventId)) > 0
      ) {
        throw new ApiConflictException(
          'SEATS_EXIST',
          'Kursi periode ini sudah ada. Konfirmasi untuk menimpa.',
        )
      }
      await this.rooms.replaceSeats(
        command.eventId,
        pickedIds,
        plan.seats.map((seat) => ({
          roomId: seat.roomId,
          seatNumber: seat.desk,
          studentId: seat.studentId,
          classroomId: seat.classroomId,
        })),
      )
      applied = true
    }

    return {
      plan,
      rooms: picked.map((room, index) => ({
        roomId: room.id,
        code: room.code,
        capacity: room.capacity,
        layout: layouts[index],
      })),
      applied,
    }
  }
}
