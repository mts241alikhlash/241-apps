import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { AppConfigModule } from '@mts241alikhlash/nest-core/config'
import { envSchema } from './core/config/env.validation.js'
import { PrismaService } from './core/database/prisma.service.js'
import { PrismaModule } from './core/database/prisma.module.js'
import { AppCacheModule } from '@mts241alikhlash/nest-core/cache'
import { HttpExceptionFilter } from '@mts241alikhlash/nest-core/filters'
import { HealthModule } from '@mts241alikhlash/nest-core/health'
import { ResponseInterceptor } from '@mts241alikhlash/nest-core/interceptors'
import { pinoLoggerConfig } from '@mts241alikhlash/nest-core/logger'
import { AuthModule } from '@mts241alikhlash/nest-core/auth'
import { IdentityModule } from '@mts241alikhlash/nest-core/identity'
import { ServiceClientModule } from '@mts241alikhlash/nest-core/service-client'
import { AcademicLookupModule } from './platform/academic-lookup/academic-lookup.module.js'
import { ProfileLookupModule } from './platform/profile-lookup/profile-lookup.module.js'
import { PermissionModule } from '@mts241alikhlash/nest-core/access-control'
import { UserModule } from './platform/user/user.module.js'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { EmployeeModule } from './employee/employee.module.js'
import { PayrollModule } from './payroll/payroll.module.js'
import { AuditLogModule } from '@mts241alikhlash/nest-core/audit-log'
import { PresenceLookupModule } from './platform/presence-lookup/presence-lookup.module.js'
import { EmploymentTypeModule } from './reference-data/employment-type/employment-type.module.js'
import { PositionModule } from './reference-data/position/position.module.js'
import { PositionCategoryModule } from './reference-data/position-category/position-category.module.js'

@Module({
  imports: [
    AppConfigModule.forRoot(envSchema),
    ServiceClientModule,
    AcademicLookupModule,
    PrismaModule,
    LoggerModule.forRoot(pinoLoggerConfig),
    ScheduleModule.forRoot(),
    AppCacheModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 500),
        },
      ],
    }),
    HealthModule.forRoot(PrismaService),
    IdentityModule,
    ProfileLookupModule,
    AuthModule,
    PermissionModule,
    UserModule,
    EmploymentTypeModule,
    PositionCategoryModule,
    PositionModule,
    EmployeeModule,
    AuditLogModule,
    PresenceLookupModule,
    PayrollModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
