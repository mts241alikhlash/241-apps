import { forwardRef, Module } from '@nestjs/common'
import { ExamFileModule } from '../exam-file/exam-file.module.js'
import { ExamPackageModule } from '../exam-package/exam-package.module.js'
import { QuestionModule } from '../question/question.module.js'
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module.js'
import { StartExamSessionUseCase } from './application/use-cases/start-exam-session/start-exam-session.use-case.js'
import { ListMyExamsUseCase } from './application/use-cases/list-my-exams/list-my-exams.use-case.js'
import { IExamAccessAttemptRepository } from './domain/repositories/exam-access-attempt.repository.js'
import { SessionAccessService } from './application/session-access.service.js'
import { LifecycleGate } from './application/lifecycle-gate.service.js'
import { SaveAnswerUseCase } from './application/use-cases/save-answer/save-answer.use-case.js'
import { SaveAnswersBatchUseCase } from './application/use-cases/save-answers-batch/save-answers-batch.use-case.js'
import { GetPaperUseCase } from './application/use-cases/get-paper/get-paper.use-case.js'
import { GetSessionFileUseCase } from './application/use-cases/get-session-file/get-session-file.use-case.js'
import { ListSavedAnswersUseCase } from './application/use-cases/list-saved-answers/list-saved-answers.use-case.js'
import { ISessionFinalizer } from './domain/repositories/session-finalizer.port.js'
import { FinalizeDueSessionsJob } from './infrastructure/jobs/finalize-due-sessions.job.js'
import { FinalizeSessionService } from './application/finalize-session.service.js'
import { FinalizeDueSessionsUseCase } from './application/use-cases/finalize-due-sessions/finalize-due-sessions.use-case.js'
import { CloseActivitySessionsUseCase } from './application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import { RecordViolationsUseCase } from './application/use-cases/record-violations/record-violations.use-case.js'
import { SubmitExamSessionUseCase } from './application/use-cases/submit-exam-session/submit-exam-session.use-case.js'
import { IExamSessionRepository } from './domain/repositories/exam-session.repository.js'
import { PrismaExamAccessAttemptRepository } from './infrastructure/persistence/prisma/prisma-exam-access-attempt.repository.js'
import { PrismaExamSessionRepository } from './infrastructure/persistence/prisma/prisma-exam-session.repository.js'
import { ExamSessionAdminController } from './presentation/http/exam-session-admin.controller.js'
import { ListScheduleSessionsUseCase } from './application/use-cases/list-schedule-sessions/list-schedule-sessions.use-case.js'
import { ReleaseSessionUseCase } from './application/use-cases/release-session/release-session.use-case.js'
import { SessionExamController } from './presentation/http/session-exam.controller.js'
import { StudentExamController } from './presentation/http/student-exam.controller.js'
import { ExamRoomModule } from '../exam-room/exam-room.module.js'
import { ExamActivityModule } from '../exam-activity/exam-activity.module.js'
import { SessionRecoveryService } from './application/session-recovery.service.js'
import { SebModule } from '../seb/seb.module.js'
import { SeatFlagService } from './application/seat-flag.service.js'
import { ISessionRecoveryRepository } from './domain/repositories/session-recovery.port.js'
import { PrismaSessionRecoveryRepository } from './infrastructure/persistence/prisma/prisma-session-recovery.repository.js'
import { ResumeExamSessionUseCase } from './application/use-cases/resume-exam-session/resume-exam-session.use-case.js'
import { CheckAbsenceGapUseCase } from './application/use-cases/check-absence-gap/check-absence-gap.use-case.js'
import { SessionHeartbeatUseCase } from './application/use-cases/session-heartbeat/session-heartbeat.use-case.js'
import { RecordSessionEventsUseCase } from './application/use-cases/record-session-events/record-session-events.use-case.js'
import { SuspendSessionUseCase } from './application/use-cases/suspend-session/suspend-session.use-case.js'
import { ReopenSessionUseCase } from './application/use-cases/reopen-session/reopen-session.use-case.js'
import { ResetSessionUseCase } from './application/use-cases/reset-session/reset-session.use-case.js'
import { ExtendSessionTimeUseCase } from './application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { AllowLateEntryUseCase } from './application/use-cases/allow-late-entry/allow-late-entry.use-case.js'
import { ListSessionAuditLogsUseCase } from './application/use-cases/list-session-audit-logs/list-session-audit-logs.use-case.js'

@Module({
  imports: [
    forwardRef(() => ExamPackageModule),
    forwardRef(() => ExamScheduleModule),
    ExamFileModule,
    QuestionModule,
    forwardRef(() => ExamRoomModule),
    forwardRef(() => ExamActivityModule),
    SebModule,
  ],
  controllers: [
    StudentExamController,
    SessionExamController,
    ExamSessionAdminController,
  ],
  providers: [
    { provide: IExamSessionRepository, useClass: PrismaExamSessionRepository },
    {
      provide: IExamAccessAttemptRepository,
      useClass: PrismaExamAccessAttemptRepository,
    },
    FinalizeSessionService,
    { provide: ISessionFinalizer, useExisting: FinalizeSessionService },
    SubmitExamSessionUseCase,
    RecordViolationsUseCase,
    ListScheduleSessionsUseCase,
    ReleaseSessionUseCase,
    FinalizeDueSessionsUseCase,
    FinalizeDueSessionsJob,
    CloseActivitySessionsUseCase,
    LifecycleGate,
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
    CheckAbsenceGapUseCase,
    RecordSessionEventsUseCase,
    SuspendSessionUseCase,
    ReopenSessionUseCase,
    ResetSessionUseCase,
    ExtendSessionTimeUseCase,
    AllowLateEntryUseCase,
    ListSessionAuditLogsUseCase,
  ],
  exports: [
    IExamSessionRepository,
    ISessionRecoveryRepository,
    SessionRecoveryService,
    SeatFlagService,
    AllowLateEntryUseCase,
    CloseActivitySessionsUseCase,
  ],
})
export class ExamSessionModule {}
