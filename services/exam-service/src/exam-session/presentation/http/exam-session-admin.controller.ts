import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { RequireAnyPermission } from '@mts241alikhlash/nest-core/access-control'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import type { RoomStaffUser } from '../../../exam-room/application/room-access.service.js'
import { ListScheduleSessionsUseCase } from '../../application/use-cases/list-schedule-sessions/list-schedule-sessions.use-case.js'
import { ReleaseSessionUseCase } from '../../application/use-cases/release-session/release-session.use-case.js'
import { ReopenSessionUseCase } from '../../application/use-cases/reopen-session/reopen-session.use-case.js'
import { ResetSessionUseCase } from '../../application/use-cases/reset-session/reset-session.use-case.js'
import { ExtendSessionTimeUseCase } from '../../application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { ListSessionAuditLogsUseCase } from '../../application/use-cases/list-session-audit-logs/list-session-audit-logs.use-case.js'
import { GetSessionTimelineUseCase } from '../../../exam-room/application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import { SessionTimelineEntryDto } from '../../../exam-room/presentation/http/dto/room-monitor.dto.js'
import {
  ScheduleSessionDto,
  ScheduleSessionListResponseDto,
} from './dto/schedule-session.dto.js'
import {
  AuditLogDto,
  ExtendSessionTimeDto,
  RecoveryReasonDto,
  RecoverySessionDto,
} from './dto/recovery.dto.js'

@ApiTags('Exam Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ExamSessionAdminController {
  constructor(
    private readonly listSessions: ListScheduleSessionsUseCase,
    private readonly releaseSession: ReleaseSessionUseCase,
    private readonly reopenSession: ReopenSessionUseCase,
    private readonly resetSession: ResetSessionUseCase,
    private readonly extendSession: ExtendSessionTimeUseCase,
    private readonly listAuditLogs: ListSessionAuditLogsUseCase,
    private readonly timeline: GetSessionTimelineUseCase,
  ) {}

  @Get('exam-schedules/:id/sessions')
  @RequirePermissions('exam-sessions.read')
  @ApiOperation({ summary: 'The sessions students started for a schedule' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ScheduleSessionListResponseDto })
  async findBySchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ScheduleSessionListResponseDto> {
    return ScheduleSessionListResponseDto.fromDomain(
      await this.listSessions.execute(id, query.page, query.limit),
    )
  }

  @Get('exam-sessions/:id/audit-logs')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'The recovery actions taken on this session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AuditLogDto] })
  async auditLogs(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogDto[]> {
    return (await this.listAuditLogs.execute(user, id)).map((row) =>
      AuditLogDto.fromDomain(row),
    )
  }

  @Get('exam-sessions/:id/timeline')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'The device events and recovery actions of one session, merged',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [SessionTimelineEntryDto] })
  async sessionTimeline(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionTimelineEntryDto[]> {
    return (await this.timeline.execute(user, id)).map((row) =>
      SessionTimelineEntryDto.fromDomain(row),
    )
  }

  @Post('exam-sessions/:id/release')
  @RequirePermissions('exam-sessions.release')
  @ApiOperation({
    summary:
      'Free the device of a session so the student can continue elsewhere',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: ScheduleSessionDto })
  async release(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecoveryReasonDto,
  ): Promise<ScheduleSessionDto> {
    return ScheduleSessionDto.fromDomain(
      await this.releaseSession.execute(user, id, dto.reason),
    )
  }

  @Post('exam-sessions/:id/reopen')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary:
      'Reopen an accidentally handed-in or violation-locked session, keeping its answers',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: RecoverySessionDto })
  async reopen(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecoveryReasonDto,
  ): Promise<RecoverySessionDto> {
    return RecoverySessionDto.fromDomain(
      await this.reopenSession.execute(user, id, dto.reason),
    )
  }

  @Post('exam-sessions/:id/reset')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Wipe the answers and restart the session with a fresh shuffle',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: RecoverySessionDto })
  async reset(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecoveryReasonDto,
  ): Promise<RecoverySessionDto> {
    return RecoverySessionDto.fromDomain(
      await this.resetSession.execute(user, id, dto.reason),
    )
  }

  @Post('exam-sessions/:id/extend-time')
  @HttpCode(200)
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'Add compensation minutes to one session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: RecoverySessionDto })
  async extendTime(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendSessionTimeDto,
  ): Promise<RecoverySessionDto> {
    return RecoverySessionDto.fromDomain(
      await this.extendSession.execute(user, id, dto.minutes, dto.reason),
    )
  }
}
