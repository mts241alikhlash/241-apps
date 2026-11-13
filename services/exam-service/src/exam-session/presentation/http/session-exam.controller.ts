import {
  Controller,
  Body,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { GetPaperUseCase } from '../../application/use-cases/get-paper/get-paper.use-case.js'
import { GetSessionFileUseCase } from '../../application/use-cases/get-session-file/get-session-file.use-case.js'
import { RecordViolationsUseCase } from '../../application/use-cases/record-violations/record-violations.use-case.js'
import { SubmitExamSessionUseCase } from '../../application/use-cases/submit-exam-session/submit-exam-session.use-case.js'
import { SaveAnswerUseCase } from '../../application/use-cases/save-answer/save-answer.use-case.js'
import { SaveAnswersBatchUseCase } from '../../application/use-cases/save-answers-batch/save-answers-batch.use-case.js'
import { ListSavedAnswersUseCase } from '../../application/use-cases/list-saved-answers/list-saved-answers.use-case.js'
import { RecordSessionEventsUseCase } from '../../application/use-cases/record-session-events/record-session-events.use-case.js'
import { ResumeExamSessionUseCase } from '../../application/use-cases/resume-exam-session/resume-exam-session.use-case.js'
import { SessionHeartbeatUseCase } from '../../application/use-cases/session-heartbeat/session-heartbeat.use-case.js'
import { SuspendSessionUseCase } from '../../application/use-cases/suspend-session/suspend-session.use-case.js'
import { ClientPlatformHeader } from './client-platform.decorator.js'
import { DeviceId } from './device-id.decorator.js'
import type { ClientPlatform } from '../../domain/policies/client-gate.policy.js'
import { SavedAnswerDto, SessionPaperDto } from './dto/paper-question.dto.js'
import { SaveAnswerDto, SavedAnswerAckDto } from './dto/save-answer.dto.js'
import {
  SaveAnswersBatchDto,
  SaveAnswersBatchResultDto,
} from './dto/save-answers-batch.dto.js'
import {
  RecordViolationsRequestDto,
  ViolationCountDto,
} from './dto/record-violations.dto.js'
import { SessionHeartbeatDto } from './dto/session-heartbeat.dto.js'
import {
  SessionSuspensionDto,
  SessionSuspensionRequestDto,
} from './dto/session-suspension.dto.js'
import {
  SubmitSessionRequestDto,
  SubmitSessionResponseDto,
} from './dto/submit-session.dto.js'
import {
  RecordSessionEventsRequestDto,
  RecordSessionEventsResponseDto,
  ResumeSessionRequestDto,
  ResumeSessionResponseDto,
} from './dto/recovery.dto.js'

@ApiTags('Student Exams')
@ApiHeader({
  name: 'X-Device-Id',
  required: true,
  description: 'The tablet the session was started on',
})
@ApiHeader({
  name: 'X-Client-Platform',
  required: false,
  description:
    "Kirim 'web' dari browser (dengan Origin atau Sec-Fetch-Site); aplikasi Android tidak mengirimnya.",
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('student-exams/:sessionId')
export class SessionExamController {
  constructor(
    private readonly getPaper: GetPaperUseCase,
    private readonly getFile: GetSessionFileUseCase,
    private readonly listAnswers: ListSavedAnswersUseCase,
    private readonly saveAnswer: SaveAnswerUseCase,
    private readonly saveAnswersBatch: SaveAnswersBatchUseCase,
    private readonly submitSession: SubmitExamSessionUseCase,
    private readonly recordViolations: RecordViolationsUseCase,
    private readonly recordEvents: RecordSessionEventsUseCase,
    private readonly resumeSession: ResumeExamSessionUseCase,
    private readonly heartbeat: SessionHeartbeatUseCase,
    private readonly suspendSession: SuspendSessionUseCase,
  ) {}

  @Get('questions')
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({ summary: 'The shuffled paper of this session, without keys' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SessionPaperDto })
  async questions(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionPaperDto> {
    return SessionPaperDto.fromDomain(
      await this.getPaper.execute({ id: user.id, deviceId }, sessionId),
    )
  }

  @Get('answers')
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({ summary: 'The answers saved so far' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [SavedAnswerDto] })
  async answers(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SavedAnswerDto[]> {
    return (
      await this.listAnswers.execute({ id: user.id, deviceId }, sessionId)
    ).map((answer) => SavedAnswerDto.fromDomain(answer))
  }

  @Post('answers')
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary: 'Save one answer; replaying a client id is a no-op',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SavedAnswerAckDto })
  async save(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SaveAnswerDto,
  ): Promise<SavedAnswerAckDto> {
    return SavedAnswerAckDto.fromDomain(
      await this.saveAnswer.execute({ id: user.id, deviceId }, sessionId, dto),
    )
  }

  @Post('answers/batch')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary: 'Save a batch of answers; a repeated entry keeps the last one',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SaveAnswersBatchResultDto })
  async saveBatch(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SaveAnswersBatchDto,
  ): Promise<SaveAnswersBatchResultDto> {
    return SaveAnswersBatchResultDto.fromDomain(
      await this.saveAnswersBatch.execute(
        { id: user.id, deviceId },
        sessionId,
        dto,
        new Date(),
      ),
    )
  }

  @Post('violations')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary:
      'Tell the server how many times the student left the exam; it keeps the highest count and answers with it',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ViolationCountDto })
  async violations(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: RecordViolationsRequestDto,
  ): Promise<ViolationCountDto> {
    return ViolationCountDto.of(
      await this.recordViolations.execute(
        { id: user.id, deviceId },
        sessionId,
        body.count,
      ),
    )
  }

  @Post('events')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary:
      'Upload the events the app recorded; leaving the app demands a fresh token',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RecordSessionEventsResponseDto })
  async events(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: RecordSessionEventsRequestDto,
  ): Promise<RecordSessionEventsResponseDto> {
    return RecordSessionEventsResponseDto.fromDomain(
      await this.recordEvents.execute(
        { id: user.id, deviceId },
        sessionId,
        {
          events: body.events.map((event) => ({
            clientId: event.clientId,
            type: event.type,
            isViolation: event.isViolation,
            detail: event.detail ?? null,
            occurredAt: new Date(event.occurredAt),
          })),
        },
        new Date(),
      ),
    )
  }

  @Post('heartbeat')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({ summary: 'Keep the session seen and read its lock state' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SessionHeartbeatDto })
  async heartbeatNow(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionHeartbeatDto> {
    const beat = await this.heartbeat.execute(
      { id: user.id, deviceId },
      sessionId,
      new Date(),
    )
    return {
      lockedByViolation: beat.lockedByViolation,
      requiresTokenReentry: beat.requiresTokenReentry,
      absentSince: beat.absentSince?.toISOString() ?? null,
      serverTime: beat.serverTime.toISOString(),
    }
  }

  @Post('suspension')
  @HttpCode(201)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({ summary: 'Give back the time a phone call took' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SessionSuspensionDto })
  async suspension(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: SessionSuspensionRequestDto,
  ): Promise<SessionSuspensionDto> {
    return SessionSuspensionDto.fromDomain(
      await this.suspendSession.execute(
        { id: user.id, deviceId },
        sessionId,
        {
          reason: body.reason,
          seconds: body.seconds,
          clientId: body.clientId,
        },
        new Date(),
      ),
    )
  }

  @Post('resume')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary: 'Continue a session after leaving the app, with the current token',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ResumeSessionResponseDto })
  async resume(
    @CurrentUser() user: { id: string },
    @ClientPlatformHeader() platform: ClientPlatform,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: ResumeSessionRequestDto,
  ): Promise<ResumeSessionResponseDto> {
    return ResumeSessionResponseDto.fromDomain(
      await this.resumeSession.execute(
        user,
        sessionId,
        {
          accessCode: body.accessCode,
          deviceId: body.deviceId,
          platform,
          seb: body.seb,
        },
        new Date(),
      ),
    )
  }

  @Post('submit')
  @HttpCode(200)
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary:
      'Hand in the exam after verifying the answers the server holds; repeating it changes nothing',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SubmitSessionResponseDto })
  async submit(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: SubmitSessionRequestDto,
  ): Promise<SubmitSessionResponseDto> {
    return SubmitSessionResponseDto.fromDomain(
      await this.submitSession.execute(
        { id: user.id, deviceId },
        sessionId,
        body ?? {},
        new Date(),
      ),
    )
  }

  @Get('files/:fileId')
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary: 'Stream an image used by the paper of this session',
  })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiParam({ name: 'fileId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The image bytes',
    content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
  })
  async file(
    @CurrentUser() user: { id: string },
    @DeviceId() deviceId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.getFile.execute(
      { id: user.id, deviceId },
      sessionId,
      fileId,
    )
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400',
    })
    return new StreamableFile(stream)
  }
}
