import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { RequireAnyPermission } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import type { Response } from 'express'
import type { GradingUser } from '../../../exam-grading/application/grading-scope.service.js'
import { BuildScoreSheetUseCase } from '../../application/use-cases/build-score-sheet/build-score-sheet.use-case.js'
import { ImportOfflineScoresUseCase } from '../../application/use-cases/import-offline-scores/import-offline-scores.use-case.js'
import { RequestOfflinePublicationUseCase } from '../../application/use-cases/request-offline-publication/request-offline-publication.use-case.js'
import {
  OFFLINE_IMPORT_MAX_BYTES,
  SCORE_SHEET_MIME,
} from '../../domain/score-sheet.js'
import { GetOfflineRosterUseCase } from '../../application/use-cases/get-offline-roster/get-offline-roster.use-case.js'
import { ListOfflineSchedulesUseCase } from '../../application/use-cases/list-offline-schedules/list-offline-schedules.use-case.js'
import { SaveOfflineScoreUseCase } from '../../application/use-cases/save-offline-score/save-offline-score.use-case.js'
import {
  RequestOfflinePublicationDto,
  SaveOfflineScoreDto,
} from './dto/exam-offline-request.dto.js'
import {
  OfflineImportResultDto,
  OfflinePublicationCountsDto,
  OfflineRosterRowDto,
  OfflineScheduleRowDto,
} from './dto/exam-offline-response.dto.js'

const UPLOAD_LIMITS = { fileSize: OFFLINE_IMPORT_MAX_BYTES + 1, files: 1 }

@ApiTags('Exam Offline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-offline')
export class ExamOfflineController {
  constructor(
    private readonly listSchedules: ListOfflineSchedulesUseCase,
    private readonly getRoster: GetOfflineRosterUseCase,
    private readonly saveScore: SaveOfflineScoreUseCase,
    private readonly importOffline: ImportOfflineScoresUseCase,
    private readonly buildSheet: BuildScoreSheetUseCase,
    private readonly requestPublication: RequestOfflinePublicationUseCase,
  ) {}

  @Get('schedules')
  @RequireAnyPermission(
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  )
  @ApiOperation({
    summary: 'The offline exams the caller may grade, with score counts',
  })
  @ApiResponse({ status: 200, type: [OfflineScheduleRowDto] })
  async schedules(
    @CurrentUser() user: GradingUser,
  ): Promise<OfflineScheduleRowDto[]> {
    const rows = await this.listSchedules.execute(user)
    return rows.map((row) => OfflineScheduleRowDto.fromDomain(row))
  }

  @Get('schedules/:id/roster')
  @RequireAnyPermission(
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  )
  @ApiOperation({
    summary: 'The seated students of an offline exam with their scores',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [OfflineRosterRowDto] })
  async roster(
    @CurrentUser() user: GradingUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OfflineRosterRowDto[]> {
    const rows = await this.getRoster.execute(user, id)
    return rows.map((row) => OfflineRosterRowDto.fromDomain(row))
  }

  @Put('schedules/:id/students/:studentId')
  @RequireAnyPermission('exam-grading.grade', 'exam-grading.manage-all')
  @ApiOperation({ summary: 'Enter, change or clear the score of one student' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiResponse({ status: 200, type: OfflineRosterRowDto })
  async save(
    @CurrentUser() user: GradingUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: SaveOfflineScoreDto,
  ): Promise<OfflineRosterRowDto> {
    return OfflineRosterRowDto.fromDomain(
      await this.saveScore.execute(user, {
        scheduleId: id,
        studentId,
        rawScore: dto.rawScore,
        note: dto.note,
      }),
    )
  }

  @Post('schedules/:id/import')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission('exam-grading.grade', 'exam-grading.manage-all')
  @UseInterceptors(FileInterceptor('file', { limits: UPLOAD_LIMITS }))
  @ApiOperation({
    summary:
      'Import scores from a filled score sheet (.xlsx or .csv) matched on No. Peserta',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, type: OfflineImportResultDto })
  async importScores(
    @CurrentUser() user: GradingUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<OfflineImportResultDto> {
    if (!file) throw new BadRequestException('Berkas wajib dilampirkan')
    return OfflineImportResultDto.fromDomain(
      await this.importOffline.execute(user, {
        scheduleId: id,
        file: { buffer: file.buffer, originalName: file.originalname },
      }),
    )
  }

  @Get('schedules/:id/sheet')
  @RequireAnyPermission(
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  )
  @ApiOperation({ summary: 'Download the prefilled score sheet (.xlsx)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The score sheet',
    content: {
      [SCORE_SHEET_MIME]: { schema: { type: 'string', format: 'binary' } },
    },
  })
  async sheet(
    @CurrentUser() user: GradingUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const sheet = await this.buildSheet.execute(user, id)
    res.set({
      'Content-Type': SCORE_SHEET_MIME,
      'Content-Length': String(sheet.buffer.length),
      'Content-Disposition': `attachment; filename="${sheet.filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    })
    return new StreamableFile(sheet.buffer)
  }

  @Post('schedules/:id/publish')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission('exam-grading.grade', 'exam-grading.manage-all')
  @ApiOperation({
    summary:
      'Queue the scores of an offline exam for sending to assessment-service',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: OfflinePublicationCountsDto })
  @ApiResponse({
    status: 409,
    description: 'OFFLINE_SCORES_MISSING: some students have no score yet',
  })
  async publish(
    @CurrentUser() user: GradingUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestOfflinePublicationDto,
  ): Promise<OfflinePublicationCountsDto> {
    return OfflinePublicationCountsDto.fromDomain(
      await this.requestPublication.execute(user, id, {
        confirmMissing: dto.confirmMissing ?? false,
      }),
    )
  }
}
