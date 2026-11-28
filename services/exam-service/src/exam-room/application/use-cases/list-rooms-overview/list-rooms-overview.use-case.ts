import { Injectable } from '@nestjs/common'
import { IAuthorLookupPort } from '../../../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { staffNamesMany } from '../../room-staff-names.js'
import { visibleRooms } from '../../room-visibility.js'

export interface RoomOverviewQuery {
  eventId?: string
}

export interface RoomOverviewRow {
  id: string
  eventId: string
  code: string
  name: string
  building: string | null
  capacity: number
  registeredCount: number
  technicianName: string | null
  currentSupervisorName: string | null
  isSubstituted: boolean
  isActiveNow: boolean
}

@Injectable()
export class ListRoomsOverviewUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly authors: IAuthorLookupPort,
    private readonly employees: IEmployeeIdentityReadPort,
  ) {}

  async execute(
    user: RoomStaffUser,
    query: RoomOverviewQuery,
    now: Date = new Date(),
  ): Promise<RoomOverviewRow[]> {
    const rooms = await visibleRooms(this.rooms, user)
    const scoped =
      query.eventId === undefined
        ? rooms
        : rooms.filter((room) => room.eventId === query.eventId)
    const loaded = await Promise.all(
      scoped.map(async (room) => ({
        room,
        slot: await this.rooms.findSupervisorAt(room.id, now),
        seats: await this.rooms.listSeatsByRoom(room.id),
      })),
    )
    const names = await staffNamesMany(
      this.authors,
      this.employees,
      loaded.map(({ room, slot }) => ({
        technicianUserId: room.technicianUserId,
        currentSupervisorUserId: slot?.actualUserId ?? null,
        scheduledSupervisorUserId: slot?.scheduledUserId ?? null,
      })),
    )
    return loaded.map(({ room, slot, seats }, i) => ({
      id: room.id,
      eventId: room.eventId,
      code: room.code,
      name: room.name,
      building: room.building,
      capacity: room.capacity,
      registeredCount: seats.length,
      technicianName: names[i].technicianName,
      currentSupervisorName: names[i].currentSupervisorName,
      isSubstituted:
        slot !== null && slot.actualUserId !== slot.scheduledUserId,
      isActiveNow: slot !== null && seats.length > 0,
    }))
  }
}
