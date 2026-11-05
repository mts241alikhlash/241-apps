import { Module } from '@nestjs/common'
import { SchoolTimeModule } from '@mts241alikhlash/nest-core/time'
import { DeviceTokenService } from './services/device-token.service.js'
import { ServerClockService } from './services/server-clock.service.js'

@Module({
  imports: [SchoolTimeModule],
  providers: [ServerClockService, DeviceTokenService],
  exports: [ServerClockService, DeviceTokenService, SchoolTimeModule],
})
export class PresenceSharedModule {}
