import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
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
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import type { GradingUser } from '../../../exam-grading/application/grading-scope.service.js'
import { GetOfflineRosterUseCase } from '../../application/use-cases/get-offline-roster/get-offline-roster.use-case.js'
import { ListOfflineSchedulesUseCase } from '../../application/use-cases/list-offline-schedules/list-offline-schedules.use-case.js'
import { SaveOfflineScoreUseCase } from '../../application/use-cases/save-offline-score/save-offline-score.use-case.js'
import { SaveOfflineScoreDto } from './dto/exam-offline-request.dto.js'
import {
  OfflineRosterRowDto,
  OfflineScheduleRowDto,
} from './dto/exam-offline-response.dto.js'

@ApiTags('Exam Offline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-offline')
export class ExamOfflineController {
  constructor(
    private readonly listSchedules: ListOfflineSchedulesUseCase,
    private readonly getRoster: GetOfflineRosterUseCase,
    private readonly saveScore: SaveOfflineScoreUseCase,
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
}
