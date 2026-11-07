import { forwardRef, Module } from '@nestjs/common'
import { ExamFileModule } from '../exam-file/exam-file.module.js'
import { ExamPackageModule } from '../exam-package/exam-package.module.js'
import { QuestionModule } from '../question/question.module.js'
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module.js'
import { StartExamSessionUseCase } from './application/use-cases/start-exam-session/start-exam-session.use-case.js'
import { ListMyExamsUseCase } from './application/use-cases/list-my-exams/list-my-exams.use-case.js'
import { IExamAccessAttemptRepository } from './domain/repositories/exam-access-attempt.repository.js'
import { SessionAccessService } from './application/session-access.service.js'
import { SaveAnswerUseCase } from './application/use-cases/save-answer/save-answer.use-case.js'
import { SaveAnswersBatchUseCase } from './application/use-cases/save-answers-batch/save-answers-batch.use-case.js'
import { GetPaperUseCase } from './application/use-cases/get-paper/get-paper.use-case.js'
import { GetSessionFileUseCase } from './application/use-cases/get-session-file/get-session-file.use-case.js'
import { ListSavedAnswersUseCase } from './application/use-cases/list-saved-answers/list-saved-answers.use-case.js'
import { ISessionFinalizer } from './domain/repositories/session-finalizer.port.js'
import { FinalizeDueSessionsJob } from './infrastructure/jobs/finalize-due-sessions.job.js'
import { FinalizeSessionService } from './application/finalize-session.service.js'
import { FinalizeDueSessionsUseCase } from './application/use-cases/finalize-due-sessions/finalize-due-sessions.use-case.js'
import { RecordViolationsUseCase } from './application/use-cases/record-violations/record-violations.use-case.js'
import { ReportCameraBlockedUseCase } from './application/use-cases/report-camera-blocked/report-camera-blocked.use-case.js'
import { SubmitExamSessionUseCase } from './application/use-cases/submit-exam-session/submit-exam-session.use-case.js'
import { IExamSessionRepository } from './domain/repositories/exam-session.repository.js'
import { PrismaExamAccessAttemptRepository } from './infrastructure/persistence/prisma/prisma-exam-access-attempt.repository.js'
import { PrismaExamSessionRepository } from './infrastructure/persistence/prisma/prisma-exam-session.repository.js'
import { IExamProctorSnapshotRepository } from './domain/repositories/exam-proctor-snapshot.repository.js'
import { PrismaExamProctorSnapshotRepository } from './infrastructure/persistence/prisma/prisma-exam-proctor-snapshot.repository.js'
import { ExamSessionAdminController } from './presentation/http/exam-session-admin.controller.js'
import { ListScheduleSessionsUseCase } from './application/use-cases/list-schedule-sessions/list-schedule-sessions.use-case.js'
import { ReleaseSessionUseCase } from './application/use-cases/release-session/release-session.use-case.js'
import { SessionExamController } from './presentation/http/session-exam.controller.js'
import { StudentExamController } from './presentation/http/student-exam.controller.js'
import { ExamRoomModule } from '../exam-room/exam-room.module.js'
import { SessionRecoveryService } from './application/session-recovery.service.js'
import { SeatFlagService } from './application/seat-flag.service.js'
import { ISessionRecoveryRepository } from './domain/repositories/session-recovery.port.js'
import { PrismaSessionRecoveryRepository } from './infrastructure/persistence/prisma/prisma-session-recovery.repository.js'
import { ResumeExamSessionUseCase } from './application/use-cases/resume-exam-session/resume-exam-session.use-case.js'
import { SessionHeartbeatUseCase } from './application/use-cases/session-heartbeat/session-heartbeat.use-case.js'
import { RecordSessionEventsUseCase } from './application/use-cases/record-session-events/record-session-events.use-case.js'
import { SuspendSessionUseCase } from './application/use-cases/suspend-session/suspend-session.use-case.js'
import { ReopenSessionUseCase } from './application/use-cases/reopen-session/reopen-session.use-case.js'
import { ResetSessionUseCase } from './application/use-cases/reset-session/reset-session.use-case.js'
import { ExtendSessionTimeUseCase } from './application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { AllowWebClientUseCase } from './application/use-cases/allow-web-client/allow-web-client.use-case.js'
import { AllowLateEntryUseCase } from './application/use-cases/allow-late-entry/allow-late-entry.use-case.js'
import { ListSessionAuditLogsUseCase } from './application/use-cases/list-session-audit-logs/list-session-audit-logs.use-case.js'
import { UploadProctorSnapshotUseCase } from './application/use-cases/upload-proctor-snapshot/upload-proctor-snapshot.use-case.js'
import { GetProctorSnapshotUseCase } from './application/use-cases/get-proctor-snapshot/get-proctor-snapshot.use-case.js'
import { ListSessionSnapshotsUseCase } from './application/use-cases/list-session-snapshots/list-session-snapshots.use-case.js'
import { CleanupExpiredSnapshotsUseCase } from './application/use-cases/cleanup-expired-snapshots/cleanup-expired-snapshots.use-case.js'
import { ProctorSnapshotCleanupJob } from './infrastructure/jobs/proctor-snapshot-cleanup.job.js'

@Module({
  imports: [
    forwardRef(() => ExamPackageModule),
    forwardRef(() => ExamScheduleModule),
    ExamFileModule,
    QuestionModule,
    forwardRef(() => ExamRoomModule),
  ],
  controllers: [
    StudentExamController,
    SessionExamController,
    ExamSessionAdminController,
  ],
  providers: [
    { provide: IExamSessionRepository, useClass: PrismaExamSessionRepository },
    {
      provide: IExamProctorSnapshotRepository,
      useClass: PrismaExamProctorSnapshotRepository,
    },
    {
      provide: IExamAccessAttemptRepository,
      useClass: PrismaExamAccessAttemptRepository,
    },
    FinalizeSessionService,
    { provide: ISessionFinalizer, useExisting: FinalizeSessionService },
    SubmitExamSessionUseCase,
    RecordViolationsUseCase,
    ReportCameraBlockedUseCase,
    ListScheduleSessionsUseCase,
    ReleaseSessionUseCase,
    FinalizeDueSessionsUseCase,
    FinalizeDueSessionsJob,
    SessionAccessService,
    GetPaperUseCase,
    SaveAnswerUseCase,
    SaveAnswersBatchUseCase,
    GetSessionFileUseCase,
    ListSavedAnswersUseCase,
    ListMyExamsUseCase,
    StartExamSessionUseCase,
    {
      provide: ISessionRecoveryRepository,
      useClass: PrismaSessionRecoveryRepository,
    },
    SessionRecoveryService,
    SeatFlagService,
    ResumeExamSessionUseCase,
    SessionHeartbeatUseCase,
    RecordSessionEventsUseCase,
    SuspendSessionUseCase,
    ReopenSessionUseCase,
    ResetSessionUseCase,
    ExtendSessionTimeUseCase,
    AllowWebClientUseCase,
    AllowLateEntryUseCase,
    ListSessionAuditLogsUseCase,
    UploadProctorSnapshotUseCase,
    GetProctorSnapshotUseCase,
    ListSessionSnapshotsUseCase,
    CleanupExpiredSnapshotsUseCase,
    ProctorSnapshotCleanupJob,
  ],
  exports: [
    IExamSessionRepository,
    IExamProctorSnapshotRepository,
    ISessionRecoveryRepository,
    SessionRecoveryService,
    SeatFlagService,
    AllowWebClientUseCase,
    AllowLateEntryUseCase,
  ],
})
export class ExamSessionModule {}
