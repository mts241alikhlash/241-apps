import { Module } from '@nestjs/common'
import { ReplaceRdmSettingUseCase } from './application/use-cases/replace-rdm-setting.use-case.js'
import { IRdmSettingRepository } from './domain/rdm-setting.js'
import { PrismaRdmSettingRepository } from './infrastructure/prisma-rdm-setting.repository.js'
import { RdmSettingController } from './presentation/http/rdm-setting.controller.js'

@Module({
  controllers: [RdmSettingController],
  providers: [
    {
      provide: IRdmSettingRepository,
      useClass: PrismaRdmSettingRepository,
    },
    ReplaceRdmSettingUseCase,
  ],
  exports: [IRdmSettingRepository],
})
export class RdmModule {}
