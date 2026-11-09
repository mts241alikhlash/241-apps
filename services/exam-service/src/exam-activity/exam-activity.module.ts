import { forwardRef, Module } from '@nestjs/common'
import { ExamSessionModule } from '../exam-session/exam-session.module.js'
import { CreateActivityUseCase } from './application/use-cases/create-activity/create-activity.use-case.js'
import { ListActivitiesUseCase } from './application/use-cases/list-activities/list-activities.use-case.js'
import { UpdateActivityStatusUseCase } from './application/use-cases/update-activity-status/update-activity-status.use-case.js'
import {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from './application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import { ExamActivityRepository } from './domain/repositories/exam-activity.repository.js'
import { PrismaExamActivityRepository } from './infrastructure/persistence/prisma/prisma-exam-activity.repository.js'
import { ExamActivityController } from './presentation/http/exam-activity.controller.js'

@Module({
  imports: [forwardRef(() => ExamSessionModule)],
  controllers: [ExamActivityController],
  providers: [
    { provide: ExamActivityRepository, useClass: PrismaExamActivityRepository },
    CreateActivityUseCase,
    ListActivitiesUseCase,
    UpdateActivityStatusUseCase,
    UpdateActivityPolicyUseCase,
    RotateActivityTokenUseCase,
  ],
  exports: [ExamActivityRepository],
})
export class ExamActivityModule {}
