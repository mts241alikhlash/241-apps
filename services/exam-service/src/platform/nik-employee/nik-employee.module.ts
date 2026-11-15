import { Global, Module } from '@nestjs/common'
import { INikEmployeePort } from './nik-employee.port.js'
import { HttpNikEmployeeAdapter } from './http-nik-employee.adapter.js'

@Global()
@Module({
  providers: [
    {
      provide: INikEmployeePort,
      useClass: HttpNikEmployeeAdapter,
    },
  ],
  exports: [INikEmployeePort],
})
export class NikEmployeeModule {}
