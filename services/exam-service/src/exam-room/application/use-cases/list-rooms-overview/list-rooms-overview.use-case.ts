import { Injectable } from '@nestjs/common'
import { IAuthorLookupPort } from '../../../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { staffNames } from '../../room-staff-names.js'
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
    return Promise.all(
      scoped.map(async (room) => {
        const slot = await this.rooms.findSupervisorAt(room.id, now)
        const seats = await this.rooms.listSeatsByRoom(room.id)
        const names = await staffNames(this.authors, this.employees, {
          technicianUserId: room.technicianUserId,
          currentSupervisorUserId: slot?.actualUserId ?? null,
          scheduledSupervisorUserId: slot?.scheduledUserId ?? null,
        })
        return {
          id: room.id,
          eventId: room.eventId,
          code: room.code,
          name: room.name,
          building: room.building,
          capacity: room.capacity,
          registeredCount: seats.length,
          technicianName: names.technicianName,
          currentSupervisorName: names.currentSupervisorName,
          isSubstituted:
            slot !== null && slot.actualUserId !== slot.scheduledUserId,
          isActiveNow: slot !== null && seats.length > 0,
        }
      }),
    )
  }
}
