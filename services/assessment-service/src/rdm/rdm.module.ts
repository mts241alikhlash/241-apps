import { Module } from '@nestjs/common'
import { AssessmentModule } from '../assessment/assessment.module.js'
import { FillRdmTemplateUseCase } from './application/use-cases/fill-rdm-template.use-case.js'
import { GetRdmCandidatesUseCase } from './application/use-cases/get-rdm-candidates.use-case.js'
import { ReplaceRdmSettingUseCase } from './application/use-cases/replace-rdm-setting.use-case.js'
import { IRdmSettingRepository } from './domain/rdm-setting.js'
import { PrismaRdmSettingRepository } from './infrastructure/prisma-rdm-setting.repository.js'
import { RdmController } from './presentation/http/rdm.controller.js'
import { RdmSettingController } from './presentation/http/rdm-setting.controller.js'

@Module({
  imports: [AssessmentModule],
  controllers: [RdmController, RdmSettingController],
  providers: [
    {
      provide: IRdmSettingRepository,
      useClass: PrismaRdmSettingRepository,
    },
    ReplaceRdmSettingUseCase,
    GetRdmCandidatesUseCase,
    FillRdmTemplateUseCase,
  ],
  exports: [IRdmSettingRepository],
})
export class RdmModule {}
