import { Global, Module } from '@nestjs/common'
import { HttpIdentityCredentialsAdapter } from './http-identity-credentials.adapter.js'
import { IIdentityCredentialsPort } from './identity-credentials.port.js'

@Global()
@Module({
  providers: [
    {
      provide: IIdentityCredentialsPort,
      useClass: HttpIdentityCredentialsAdapter,
    },
  ],
  exports: [IIdentityCredentialsPort],
})
export class IdentityCredentialsModule {}
