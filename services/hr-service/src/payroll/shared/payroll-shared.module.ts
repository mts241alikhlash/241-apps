import { Module } from '@nestjs/common'
import { AuditLogModule } from '@mts241alikhlash/nest-core/audit-log'
import { PayrollAuditService } from './services/payroll-audit.service.js'

@Module({
  imports: [AuditLogModule],
  providers: [PayrollAuditService],
  exports: [PayrollAuditService],
})
export class PayrollSharedModule {}
