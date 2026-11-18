import { Injectable } from '@nestjs/common'
import type { ExamRoomReport } from '../../../domain/entities/exam-room-report.entity.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import {
  RoomReportService,
  type ReportFileInput,
} from '../../room-report.service.js'

@Injectable()
export class SubmitRoomReportUseCase {
  constructor(private readonly reports: RoomReportService) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    file: ReportFileInput | undefined,
    now: Date = new Date(),
  ): Promise<ExamRoomReport> {
    const context = await this.reports.loadEditable(user, roomId, slotId, now)
    return this.reports.submit(context, user.id, now, file)
  }

  replaceFile(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    file: ReportFileInput | undefined,
    now: Date = new Date(),
  ): Promise<ExamRoomReport> {
    return this.reports.replaceFile(user, roomId, slotId, file, now)
  }

  async download(user: RoomStaffUser, roomId: string, slotId: string) {
    const context = await this.reports.load(user, roomId, slotId)
    return this.reports.openFile(context)
  }
}
