import { SchoolTimeModule } from '@mts241alikhlash/nest-core/time'
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
import { GetPrintPackUseCase } from './application/use-cases/get-print-pack/get-print-pack.use-case.js'
import { ResetEventCredentialsUseCase } from './application/use-cases/reset-event-credentials/reset-event-credentials.use-case.js'
import { GenerateSeatsUseCase } from './application/use-cases/generate-seats/generate-seats.use-case.js'
import { GenerateRoomSlotsUseCase } from './application/use-cases/generate-room-slots/generate-room-slots.use-case.js'
import { IssueSemesterParticipantNumbersUseCase } from './application/use-cases/issue-semester-participant-numbers/issue-semester-participant-numbers.use-case.js'
import { LookupParticipantNumbersUseCase } from './application/use-cases/lookup-participant-numbers/lookup-participant-numbers.use-case.js'
import { ListRoomReportsUseCase } from './application/use-cases/list-room-reports/list-room-reports.use-case.js'
import { ListRoomsOverviewUseCase } from './application/use-cases/list-rooms-overview/list-rooms-overview.use-case.js'
import { GetSessionTimelineUseCase } from './application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import { GetRoomReportUseCase } from './application/use-cases/get-room-report/get-room-report.use-case.js'
import { SaveRoomReportUseCase } from './application/use-cases/save-room-report/save-room-report.use-case.js'
import { SubmitRoomReportUseCase } from './application/use-cases/submit-room-report/submit-room-report.use-case.js'
import { VerifyRoomReportUseCase } from './application/use-cases/verify-room-report/verify-room-report.use-case.js'
import { AttendanceFileService } from './application/attendance-file.service.js'
import { IAttendanceFileRepository } from './domain/repositories/attendance-file.repository.js'
import { IAttendanceFileStorage } from './domain/repositories/attendance-file-storage.js'
import { StorageAttendanceFileStorage } from './infrastructure/storage-attendance-file-storage.js'
import { PrismaAttendanceFileRepository } from './infrastructure/persistence/prisma/prisma-attendance-file.repository.js'
import { ExamAttendanceFileController } from './presentation/http/exam-attendance-file.controller.js'
import { RoomReportService } from './application/room-report.service.js'
import { IExamRoomRepository } from './domain/repositories/exam-room.repository.js'
import { IRoomReportFileStorage } from './domain/repositories/room-report-file-storage.js'
import { StorageRoomReportFileStorage } from './infrastructure/storage-room-report-file-storage.js'
import { PrismaExamRoomRepository } from './infrastructure/persistence/prisma/prisma-exam-room.repository.js'
import { ExamEventController } from './presentation/http/exam-event.controller.js'
import { ExamParticipantNumberController } from './presentation/http/participant-number.controller.js'
import {
  ExamRoomController,
  ExamRoomOverviewController,
} from './presentation/http/exam-room.controller.js'

@Module({
  imports: [
    SchoolTimeModule,
    forwardRef(() => ExamPackageModule),
    forwardRef(() => ExamScheduleModule),
    forwardRef(() => ExamSessionModule),
  ],
  controllers: [
    ExamEventController,
    ExamAttendanceFileController,
    ExamRoomController,
    ExamRoomOverviewController,
    ExamParticipantNumberController,
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
    {
      provide: IRoomReportFileStorage,
      useClass: StorageRoomReportFileStorage,
    },
    {
      provide: IAttendanceFileRepository,
      useClass: PrismaAttendanceFileRepository,
    },
    {
      provide: IAttendanceFileStorage,
      useClass: StorageAttendanceFileStorage,
    },
    AttendanceFileService,
    RoomAccessService,
    ManageExamEventsUseCase,
    ManageExamRoomsUseCase,
    ListSupervisorsUseCase,
    AssignSupervisorUseCase,
    SubstituteSupervisorUseCase,
    ExtendRoomTimeUseCase,
    RoomReportService,
    GetRoomMonitorUseCase,
    GetPrintPackUseCase,
    ResetEventCredentialsUseCase,
    GenerateSeatsUseCase,
    GenerateRoomSlotsUseCase,
    IssueSemesterParticipantNumbersUseCase,
    LookupParticipantNumbersUseCase,
    ListRoomsOverviewUseCase,
    ListRoomReportsUseCase,
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
