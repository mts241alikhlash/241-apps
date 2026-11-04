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
import { PermissionModule } from '@mts241alikhlash/nest-core/access-control'
import { EmployeeIdentityModule } from './platform/employee-identity/employee-identity.module.js'
import { ParentLookupModule } from './platform/parent-lookup/parent-lookup.module.js'
import { EmployeeLookupModule } from './platform/employee-lookup/employee-lookup.module.js'
import { StudentLookupModule } from './platform/student-lookup/student-lookup.module.js'
import { StudentIdentityModule } from './platform/student-identity/student-identity.module.js'
import { ProfileLookupModule } from './platform/profile-lookup/profile-lookup.module.js'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { AcademicSettingModule } from './academic-setting/academic-setting.module.js'
import { AcademicYearModule } from './academic-year/academic-year.module.js'
import { CalendarModule } from './calendar/calendar.module.js'
import { ClassroomModule } from './classroom/classroom.module.js'
import { CurriculumModule } from './curriculum/curriculum.module.js'
import { EnrollmentLookupModule } from './platform/enrollment-lookup/enrollment-lookup.module.js'
import { ServiceClientModule } from '@mts241alikhlash/nest-core/service-client'
import { GradeModule } from './grade/grade.module.js'
import { AcademicCalendarTypeModule } from './reference-data/academic-calendar-type/academic-calendar-type.module.js'
import { ReferenceListsModule } from './reference-data/reference-lists.module.js'
import { SemesterTypeModule } from './reference-data/semester-type/semester-type.module.js'
import { ScheduleModule as AcademicScheduleModule } from './schedule/schedule.module.js'
import { SemesterModule } from './semester/semester.module.js'
import { SubjectModule } from './subject/subject.module.js'
import { TeachingAssignmentModule } from './teaching-assignment/teaching-assignment.module.js'
import { SemesterRolloverModule } from './semester-rollover/semester-rollover.module.js'

@Module({
  imports: [
    AppConfigModule.forRoot(envSchema),
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
    AuthModule,
    PermissionModule,
    EmployeeIdentityModule,
    ParentLookupModule,
    EmployeeLookupModule,
    StudentLookupModule,
    StudentIdentityModule,
    ProfileLookupModule,
    AcademicSettingModule,
    AcademicYearModule,
    CalendarModule,
    ClassroomModule,
    CurriculumModule,
    ServiceClientModule,
    EnrollmentLookupModule,
    SemesterRolloverModule,
    GradeModule,
    AcademicCalendarTypeModule,
    ReferenceListsModule,
    SemesterTypeModule,
    AcademicScheduleModule,
    SemesterModule,
    SubjectModule,
    TeachingAssignmentModule,
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
