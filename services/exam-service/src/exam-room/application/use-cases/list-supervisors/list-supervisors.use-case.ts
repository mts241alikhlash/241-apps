import { Injectable } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

@Injectable()
export class ListSupervisorsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
  ): Promise<ExamRoomSupervisor[]> {
    await this.access.assertCanView(user, roomId)
    return this.rooms.listSupervisors(roomId)
  }
}
