import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { UserThrottlerGuard } from './core/throttling/user-throttler.guard.js'
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
import { IdentityModule } from '@mts241alikhlash/nest-core/identity'
import { ServiceClientModule } from '@mts241alikhlash/nest-core/service-client'
import { AuthModule } from '@mts241alikhlash/nest-core/auth'
import { AuthorLookupModule } from './platform/author-lookup/author-lookup.module.js'
import { AcademicLookupModule } from './platform/academic-lookup/academic-lookup.module.js'
import { ExamFileModule } from './exam-file/exam-file.module.js'
import { ExamActivityModule } from './exam-activity/exam-activity.module.js'
import { ExamPackageModule } from './exam-package/exam-package.module.js'
import { ExamScheduleModule } from './exam-schedule/exam-schedule.module.js'
import { ScorePublisherModule } from './platform/score-publisher/score-publisher.module.js'
import { StudentDirectoryModule } from './platform/student-directory/student-directory.module.js'
import { ExamGradingModule } from './exam-grading/exam-grading.module.js'
import { ExamMakeupModule } from './exam-schedule/exam-makeup.module.js'
import { ExamSessionModule } from './exam-session/exam-session.module.js'
import { ExamRoomModule } from './exam-room/exam-room.module.js'
import { QuestionImportModule } from './question-import/question-import.module.js'
import { QuestionModule } from './question/question.module.js'
import { StorageModule } from './core/storage/storage.module.js'
import { PermissionModule } from '@mts241alikhlash/nest-core/access-control'
import { EmployeeIdentityModule } from './platform/employee-identity/employee-identity.module.js'
import { EnrollmentLookupModule } from './platform/enrollment-lookup/enrollment-lookup.module.js'
import { StudentIdentityModule } from './platform/student-identity/student-identity.module.js'
import { ParticipantNumberModule } from './platform/participant-number/participant-number.module.js'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'

@Module({
  imports: [
    AppConfigModule.forRoot(envSchema),
    ServiceClientModule,
    PrismaModule,
    StorageModule,
    AcademicLookupModule,
    AuthorLookupModule,
    QuestionModule,
    ExamActivityModule,
    ExamPackageModule,
    ExamScheduleModule,
    ExamSessionModule,
    ExamRoomModule,
    ExamMakeupModule,
    ExamGradingModule,
    ScorePublisherModule,
    StudentDirectoryModule,
    ExamFileModule,
    QuestionImportModule,
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
    StudentIdentityModule,
    EnrollmentLookupModule,
    ParticipantNumberModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
