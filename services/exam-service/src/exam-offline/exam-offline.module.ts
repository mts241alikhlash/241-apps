import { forwardRef, Module } from '@nestjs/common'
import { ExamActivityModule } from '../exam-activity/exam-activity.module.js'
import { ExamGradingModule } from '../exam-grading/exam-grading.module.js'
import { ExamRoomModule } from '../exam-room/exam-room.module.js'
import { ExamScheduleModule } from '../exam-schedule/exam-schedule.module.js'
import { OfflineRosterReader } from './application/offline-roster.reader.js'
import { GetOfflineRosterUseCase } from './application/use-cases/get-offline-roster/get-offline-roster.use-case.js'
import { ListOfflineSchedulesUseCase } from './application/use-cases/list-offline-schedules/list-offline-schedules.use-case.js'
import { SaveOfflineScoreUseCase } from './application/use-cases/save-offline-score/save-offline-score.use-case.js'
import { IOfflineResultRepository } from './domain/repositories/offline-result.repository.js'
import { PrismaOfflineResultRepository } from './infrastructure/persistence/prisma-offline-result.repository.js'
import { ExamOfflineController } from './presentation/http/exam-offline.controller.js'

@Module({
  imports: [
    ExamGradingModule,
    forwardRef(() => ExamActivityModule),
    forwardRef(() => ExamScheduleModule),
    forwardRef(() => ExamRoomModule),
  ],
  controllers: [ExamOfflineController],
  providers: [
    {
      provide: IOfflineResultRepository,
      useClass: PrismaOfflineResultRepository,
    },
    OfflineRosterReader,
    ListOfflineSchedulesUseCase,
    GetOfflineRosterUseCase,
    SaveOfflineScoreUseCase,
  ],
})
export class ExamOfflineModule {}
