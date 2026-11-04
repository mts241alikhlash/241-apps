import { Module } from '@nestjs/common'
import { HttpAuditLogAdapter } from './http-audit-log.adapter.js'
import { IAuditLogPort } from './audit-log.port.js'
import { CreateAuditLogUseCase } from './create-audit-log.use-case.js'

@Module({
  providers: [
    { provide: IAuditLogPort, useClass: HttpAuditLogAdapter },
    CreateAuditLogUseCase,
  ],
  exports: [CreateAuditLogUseCase],
})
export class AuditLogModule {}
