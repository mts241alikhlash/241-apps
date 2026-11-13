import { Module } from '@nestjs/common'
import { ManageSebConfigsUseCase } from './application/use-cases/manage-seb-configs/manage-seb-configs.use-case.js'
import { ISebConfigRepository } from './domain/repositories/seb-config.repository.js'
import { ISebConfigStorage } from './domain/repositories/seb-config-storage.js'
import { PrismaSebConfigRepository } from './infrastructure/persistence/prisma/prisma-seb-config.repository.js'
import { StorageSebConfigStorage } from './infrastructure/storage-seb-config-storage.js'
import {
  SebConfigController,
  SebConfigFileController,
} from './presentation/http/seb-config.controller.js'

@Module({
  controllers: [SebConfigController, SebConfigFileController],
  providers: [
    { provide: ISebConfigRepository, useClass: PrismaSebConfigRepository },
    { provide: ISebConfigStorage, useClass: StorageSebConfigStorage },
    ManageSebConfigsUseCase,
  ],
  exports: [ManageSebConfigsUseCase],
})
export class SebModule {}
