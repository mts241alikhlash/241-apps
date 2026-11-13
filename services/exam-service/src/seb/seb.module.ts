import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ManageSebConfigsUseCase } from './application/use-cases/manage-seb-configs/manage-seb-configs.use-case.js'
import {
  SEB_ALLOWED_ORIGINS,
  SebVerifier,
} from './application/seb-verifier.service.js'
import { ISebConfigRepository } from './domain/repositories/seb-config.repository.js'
import { ISebConfigStorage } from './domain/repositories/seb-config-storage.js'
import { PrismaSebConfigRepository } from './infrastructure/persistence/prisma/prisma-seb-config.repository.js'
import { StorageSebConfigStorage } from './infrastructure/storage-seb-config-storage.js'
import { parseFrontendOrigins } from '../shared/config/frontend-origins.js'
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
    SebVerifier,
    {
      provide: SEB_ALLOWED_ORIGINS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        parseFrontendOrigins(
          config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
        ),
    },
  ],
  exports: [ManageSebConfigsUseCase, SebVerifier],
})
export class SebModule {}
