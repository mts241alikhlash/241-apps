import { forwardRef, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ExamPackageModule } from '../exam-package/exam-package.module.js'
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module.js'
import { ExamSessionModule } from '../exam-session/exam-session.module.js'
import { RoomAccessCodeService } from './application/room-access-code.service.js'
import { RoomAccessService } from './application/room-access.service.js'
import { AssignSupervisorUseCase } from './application/use-cases/assign-supervisor/assign-supervisor.use-case.js'
import { ListSupervisorsUseCase } from './application/use-cases/list-supervisors/list-supervisors.use-case.js'
import { ManageExamEventsUseCase } from './application/use-cases/manage-exam-events/manage-exam-events.use-case.js'
import { ManageExamRoomsUseCase } from './application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import { SubstituteSupervisorUseCase } from './application/use-cases/substitute-supervisor/substitute-supervisor.use-case.js'
import { ExtendRoomTimeUseCase } from './application/use-cases/extend-room-time/extend-room-time.use-case.js'
import { GetRoomMonitorUseCase } from './application/use-cases/get-room-monitor/get-room-monitor.use-case.js'
import { ListRoomsOverviewUseCase } from './application/use-cases/list-rooms-overview/list-rooms-overview.use-case.js'
import { GetSessionTimelineUseCase } from './application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import { GetRoomReportUseCase } from './application/use-cases/get-room-report/get-room-report.use-case.js'
import { SaveRoomReportUseCase } from './application/use-cases/save-room-report/save-room-report.use-case.js'
import { SubmitRoomReportUseCase } from './application/use-cases/submit-room-report/submit-room-report.use-case.js'
import { VerifyRoomReportUseCase } from './application/use-cases/verify-room-report/verify-room-report.use-case.js'
import { RoomReportService } from './application/room-report.service.js'
import { IExamRoomRepository } from './domain/repositories/exam-room.repository.js'
import { PrismaExamRoomRepository } from './infrastructure/persistence/prisma/prisma-exam-room.repository.js'
import { ExamEventController } from './presentation/http/exam-event.controller.js'
import {
  ExamRoomController,
  ExamRoomOverviewController,
} from './presentation/http/exam-room.controller.js'

@Module({
  imports: [
    forwardRef(() => ExamPackageModule),
    forwardRef(() => ExamScheduleModule),
    forwardRef(() => ExamSessionModule),
  ],
  controllers: [
    ExamEventController,
    ExamRoomController,
    ExamRoomOverviewController,
  ],
  providers: [
    { provide: IExamRoomRepository, useClass: PrismaExamRoomRepository },
    {
      provide: RoomAccessCodeService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RoomAccessCodeService(
          config.getOrThrow<string>('EXAM_ACCESS_CODE_SECRET'),
        ),
    },
    RoomAccessService,
    ManageExamEventsUseCase,
    ManageExamRoomsUseCase,
    ListSupervisorsUseCase,
    AssignSupervisorUseCase,
    SubstituteSupervisorUseCase,
    ExtendRoomTimeUseCase,
    RoomReportService,
    GetRoomMonitorUseCase,
    ListRoomsOverviewUseCase,
    GetSessionTimelineUseCase,
    GetRoomReportUseCase,
    SaveRoomReportUseCase,
    SubmitRoomReportUseCase,
    VerifyRoomReportUseCase,
  ],
  exports: [
    IExamRoomRepository,
    RoomAccessService,
    RoomAccessCodeService,
    GetSessionTimelineUseCase,
  ],
})
export class ExamRoomModule {}
