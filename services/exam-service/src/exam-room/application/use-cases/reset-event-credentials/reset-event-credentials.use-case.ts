import { Injectable, NotFoundException } from '@nestjs/common'
import { IIdentityCredentialsPort } from '../../../../platform/identity-credentials/identity-credentials.port.js'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

export interface ResetEventCredentialsItem {
  studentId: string
  identifier: string
  password: string
}

export interface ResetEventCredentialsResult {
  items: ResetEventCredentialsItem[]
  skipped: string[]
}

@Injectable()
export class ResetEventCredentialsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly identity: IIdentityCredentialsPort,
  ) {}

  async execute(
    eventId: string,
    actorId: string,
    roomId?: string,
  ): Promise<ResetEventCredentialsResult> {
    const event = await this.rooms.findEventById(eventId)
    if (event === null)
      throw new NotFoundException('Acara ujian tidak ditemukan')
    let rooms = await this.rooms.listRoomsByEvent(eventId)
    if (roomId !== undefined) {
      rooms = rooms.filter((room) => room.id === roomId)
      if (rooms.length === 0)
        throw new NotFoundException('Ruang tidak ditemukan')
    }
    const roomIds = new Set(rooms.map((room) => room.id))
    const seats = (await this.rooms.listSeatsByEvent(eventId)).filter((seat) =>
      roomIds.has(seat.roomId),
    )
    if (seats.length === 0) return { items: [], skipped: [] }

    const studentIds = [...new Set(seats.map((seat) => seat.studentId))]
    const refs = new Map(
      (await this.students.refsByIds(studentIds)).map((ref) => [ref.id, ref]),
    )
    const skipped: string[] = []
    const userOf = new Map<string, string>()
    for (const studentId of studentIds) {
      const userId = refs.get(studentId)?.userId ?? null
      if (userId === null) skipped.push(studentId)
      else userOf.set(studentId, userId)
    }

    const issued = await this.identity.resetPasswords([
      ...new Set(userOf.values()),
    ])
    const byUser = new Map(issued.map((row) => [row.userId, row]))
    const items: ResetEventCredentialsItem[] = []
    for (const [studentId, userId] of userOf) {
      const credential = byUser.get(userId)
      if (credential === undefined) skipped.push(studentId)
      else
        items.push({
          studentId,
          identifier: credential.identifier,
          password: credential.password,
        })
    }

    await this.rooms.writeAuditLog({
      roomId: roomId ?? null,
      action: 'RESET_CREDENTIALS',
      actorId,
      reason: 'Reset kata sandi peserta ujian',
      metadata: { count: items.length },
    })

    return { items, skipped }
  }
}
