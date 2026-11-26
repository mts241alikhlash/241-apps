import { Module } from '@nestjs/common'
import { AssessmentModule } from '../assessment/assessment.module.js'
import { DownloadRdmWorkbookUseCase } from './application/use-cases/download-rdm-workbook.use-case.js'
import { FillRdmTemplateUseCase } from './application/use-cases/fill-rdm-template.use-case.js'
import { GetRdmCandidatesUseCase } from './application/use-cases/get-rdm-candidates.use-case.js'
import { ImportRdmWorkbookUseCase } from './application/use-cases/import-rdm-workbook.use-case.js'
import { ReplaceRdmSettingUseCase } from './application/use-cases/replace-rdm-setting.use-case.js'
import { IRdmImportRepository } from './domain/rdm-import.repository.js'
import { IRdmSettingRepository } from './domain/rdm-setting.js'
import { PrismaRdmImportRepository } from './infrastructure/prisma-rdm-import.repository.js'
import { PrismaRdmSettingRepository } from './infrastructure/prisma-rdm-setting.repository.js'
import { RdmSettingController } from './presentation/http/rdm-setting.controller.js'
import { RdmController } from './presentation/http/rdm.controller.js'

@Module({
  imports: [AssessmentModule],
  controllers: [RdmController, RdmSettingController],
  providers: [
    {
      provide: IRdmSettingRepository,
      useClass: PrismaRdmSettingRepository,
    },
    {
      provide: IRdmImportRepository,
      useClass: PrismaRdmImportRepository,
    },
    ReplaceRdmSettingUseCase,
    GetRdmCandidatesUseCase,
    FillRdmTemplateUseCase,
    DownloadRdmWorkbookUseCase,
    ImportRdmWorkbookUseCase,
  ],
  exports: [IRdmSettingRepository],
})
export class RdmModule {}
