import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import type { Readable } from 'node:stream'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { RequireAnyPermission } from '../../../platform/access-control/permission/decorators/require-any-permission.decorator.js'
import { RequirePermissions } from '../../../platform/access-control/permission/decorators/require-permissions.decorator.js'
import { JwtAuthGuard } from '../../../platform/auth/index.js'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'
import type { RoomStaffUser } from '../../../exam-room/application/room-access.service.js'
import { ListScheduleSessionsUseCase } from '../../application/use-cases/list-schedule-sessions/list-schedule-sessions.use-case.js'
import { ReleaseSessionUseCase } from '../../application/use-cases/release-session/release-session.use-case.js'
import { ReopenSessionUseCase } from '../../application/use-cases/reopen-session/reopen-session.use-case.js'
import { ResetSessionUseCase } from '../../application/use-cases/reset-session/reset-session.use-case.js'
import { ExtendSessionTimeUseCase } from '../../application/use-cases/extend-session-time/extend-session-time.use-case.js'
import { ListSessionAuditLogsUseCase } from '../../application/use-cases/list-session-audit-logs/list-session-audit-logs.use-case.js'
import { GetSessionTimelineUseCase } from '../../../exam-room/application/use-cases/get-session-timeline/get-session-timeline.use-case.js'
import { GetProctorSnapshotUseCase } from '../../application/use-cases/get-proctor-snapshot/get-proctor-snapshot.use-case.js'
import { ListSessionSnapshotsUseCase } from '../../application/use-cases/list-session-snapshots/list-session-snapshots.use-case.js'
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
import { ProctorSnapshotDto } from './dto/proctor-snapshot.dto.js'

function streamJpeg(
  sizeBytes: number,
  stream: Readable,
  res: Response,
): StreamableFile {
  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Length': String(sizeBytes),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, max-age=10',
  })
  return new StreamableFile(stream)
}

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
    private readonly listSnapshots: ListSessionSnapshotsUseCase,
    private readonly getSnapshot: GetProctorSnapshotUseCase,
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

  @Get('exam-sessions/:id/snapshots')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'The evidence snapshots kept for this session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [ProctorSnapshotDto] })
  async snapshots(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProctorSnapshotDto[]> {
    return (await this.listSnapshots.execute(user, id)).map((row) =>
      ProctorSnapshotDto.fromDomain(row),
    )
  }

  @Get('exam-sessions/:id/snapshots/latest')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'Stream the newest snapshot of this session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The JPEG bytes',
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async latestSnapshot(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { contentLength, stream } = await this.getSnapshot.execute(
      user,
      id,
      'latest',
    )
    return streamJpeg(contentLength, stream, res)
  }

  @Get('exam-sessions/:id/snapshots/:snapshotId')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'Stream one evidence snapshot of this session' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'snapshotId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The JPEG bytes',
    content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
  })
  async snapshot(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('snapshotId', ParseUUIDPipe) snapshotId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { contentLength, stream } = await this.getSnapshot.execute(
      user,
      id,
      snapshotId,
    )
    return streamJpeg(contentLength, stream, res)
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
