import { Injectable, NotFoundException } from '@nestjs/common'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

export interface GenerateRoomSlotsResult {
  created: number
  skipped: number
}

@Injectable()
export class GenerateRoomSlotsUseCase {
  constructor(private readonly rooms: IExamRoomRepository) {}

  async execute(eventId: string): Promise<GenerateRoomSlotsResult> {
    if ((await this.rooms.findEventById(eventId)) === null) {
      throw new NotFoundException('Acara ujian tidak ditemukan')
    }
    const [rooms, activities] = await Promise.all([
      this.rooms.listRoomsByEvent(eventId),
      this.rooms.listActivitiesByEvent(eventId),
    ])
    const windows = new Map<string, { startsAt: Date; endsAt: Date }>()
    for (const activity of activities) {
      windows.set(
        `${activity.startsAt.toISOString()}|${activity.endsAt.toISOString()}`,
        {
          startsAt: activity.startsAt,
          endsAt: activity.endsAt,
        },
      )
    }
    let created = 0
    let skipped = 0
    for (const room of rooms) {
      const existing = await this.rooms.listSupervisors(room.id)
      for (const window of windows.values()) {
        const exists = existing.some(
          (slot) =>
            slot.startsAt.getTime() === window.startsAt.getTime() &&
            slot.endsAt.getTime() === window.endsAt.getTime(),
        )
        if (exists) {
          skipped += 1
          continue
        }
        await this.rooms.assignSupervisor({
          roomId: room.id,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          scheduledUserId: null,
        })
        created += 1
      }
    }
    return { created, skipped }
  }
}
