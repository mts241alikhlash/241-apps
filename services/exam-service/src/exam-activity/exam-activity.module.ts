import { Module } from '@nestjs/common'
import { CreateActivityUseCase } from './application/use-cases/create-activity/create-activity.use-case.js'
import {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from './application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import { ExamActivityRepository } from './domain/repositories/exam-activity.repository.js'
import { PrismaExamActivityRepository } from './infrastructure/persistence/prisma/prisma-exam-activity.repository.js'
import { ExamActivityController } from './presentation/http/exam-activity.controller.js'

@Module({
  controllers: [ExamActivityController],
  providers: [
    { provide: ExamActivityRepository, useClass: PrismaExamActivityRepository },
    CreateActivityUseCase,
    UpdateActivityPolicyUseCase,
    RotateActivityTokenUseCase,
  ],
  exports: [ExamActivityRepository],
})
export class ExamActivityModule {}
