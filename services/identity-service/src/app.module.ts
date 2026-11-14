import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { onlyWhereDeclared } from '@mts241alikhlash/nest-core/throttle'
import { LoggerModule } from 'nestjs-pino'
import { AppConfigModule } from '@mts241alikhlash/nest-core/config'
import { envSchema } from './core/config/env.validation.js'
import { PrismaService } from './core/database/prisma.service.js'
import { authTracker } from './core/throttle/auth-tracker.js'
import { StorageModule } from './core/storage/storage.module.js'
import { PrismaModule } from './core/database/prisma.module.js'
import { HttpExceptionFilter } from '@mts241alikhlash/nest-core/filters'
import { HealthModule } from '@mts241alikhlash/nest-core/health'
import { ResponseInterceptor } from '@mts241alikhlash/nest-core/interceptors'
import { pinoLoggerConfig } from '@mts241alikhlash/nest-core/logger'
import { AuthModule } from './auth/auth.module.js'
import { JwtAuthGuard } from './auth/index.js'
import { UserModule } from './user/user.module.js'
import { ProfileModule } from './profile/profile.module.js'
import { RegionModule } from './reference-data/region/region.module.js'
import { RoleModule } from './access-control/role/role.module.js'
import { PermissionModule } from './access-control/permission/permission.module.js'
import { PermissionGuard } from './access-control/permission/guards/permission.guard.js'
import { SessionModule } from './session/session.module.js'
import { AuditLogModule } from './audit-log/audit-log.module.js'
import { SchoolUnitModule } from './school-unit/school-unit.module.js'
import { SchoolUnitTypeModule } from './reference-data/school-unit-type/school-unit-type.module.js'
import { ReligionModule } from './reference-data/religion/religion.module.js'
import { BloodTypeModule } from './reference-data/blood-type/blood-type.module.js'

@Module({
  imports: [
    AppConfigModule.forRoot(envSchema),
    StorageModule,
    PrismaModule,
    LoggerModule.forRoot(pinoLoggerConfig),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 500),
        },
        {
          name: 'auth',
          skipIf: onlyWhereDeclared('auth'),
          getTracker: authTracker,
          ttl: configService.get<number>('AUTH_THROTTLE_TTL', 60000),
          limit: configService.get<number>('AUTH_THROTTLE_LIMIT', 20),
        },
      ],
    }),
    HealthModule.forRoot(PrismaService),
    AuthModule,
    UserModule,
    ProfileModule,
    RegionModule,
    RoleModule,
    PermissionModule,
    SessionModule,
    AuditLogModule,
    SchoolUnitModule,
    SchoolUnitTypeModule,
    ReligionModule,
    BloodTypeModule,
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
