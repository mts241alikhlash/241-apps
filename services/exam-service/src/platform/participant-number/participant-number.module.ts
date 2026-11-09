import { Global, Module } from '@nestjs/common'
import { HttpParticipantNumberAdapter } from './http-participant-number.adapter.js'
import { IParticipantNumberPort } from './participant-number.port.js'

@Global()
@Module({
  providers: [
    { provide: IParticipantNumberPort, useClass: HttpParticipantNumberAdapter },
  ],
  exports: [IParticipantNumberPort],
})
export class ParticipantNumberModule {}
