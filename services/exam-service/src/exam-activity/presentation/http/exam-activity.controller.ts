import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { CreateActivityUseCase } from '../../application/use-cases/create-activity/create-activity.use-case.js'
import { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ListActivitiesUseCase } from '../../application/use-cases/list-activities/list-activities.use-case.js'
import { UpdateActivityStatusUseCase } from '../../application/use-cases/update-activity-status/update-activity-status.use-case.js'
import {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from '../../application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import {
  CreateActivityRequestDto,
  ExamActivityDto,
  IssueParticipantNumbersResponseDto,
  UpdateActivityPolicyRequestDto,
  UpdateActivityStatusRequestDto,
} from './dto/exam-activity.dto.js'

@ApiTags('Exam Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-activities')
export class ExamActivityController {
  constructor(
    private readonly createActivity: CreateActivityUseCase,
    private readonly listActivities: ListActivitiesUseCase,
    private readonly updateStatus: UpdateActivityStatusUseCase,
    private readonly updatePolicy: UpdateActivityPolicyUseCase,
    private readonly rotateToken: RotateActivityTokenUseCase,
    private readonly issueParticipantNumbers: IssueParticipantNumbersUseCase,
  ) {}

  @Get()
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({ summary: 'List the activities of the active semester' })
  @ApiResponse({ status: 200, type: [ExamActivityDto] })
  async list(): Promise<ExamActivityDto[]> {
    const activities = await this.listActivities.execute()
    return activities.map((activity) => ExamActivityDto.of(activity))
  }

  @Patch(':id')
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({ summary: 'Change the status of an activity' })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async changeStatus(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityStatusRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.updateStatus.execute(user.id, id, dto.status)
    return ExamActivityDto.of(activity)
  }

  @Post(':id/participant-numbers/issue')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({
    summary: 'Issue the participant numbers of the activity semester again',
  })
  @ApiResponse({ status: 200, type: IssueParticipantNumbersResponseDto })
  async issueNumbers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IssueParticipantNumbersResponseDto> {
    return IssueParticipantNumbersResponseDto.of(
      (await this.issueParticipantNumbers.execute(id)).issued,
    )
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({ summary: 'Create one activity for a grade and its classes' })
  @ApiResponse({ status: 201, type: ExamActivityDto })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateActivityRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.createActivity.execute({
      actorId: user.id,
      semesterId: dto.semesterId,
      eventId: dto.eventId ?? null,
      gradeId: dto.gradeId,
      subjectId: dto.subjectId,
      packageId: dto.packageId,
      type: dto.type,
      classroomIds: dto.classroomIds,
      presetName: dto.presetName,
      tokenMode: dto.tokenMode,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      durationMinutes: dto.durationMinutes,
    })
    return ExamActivityDto.of(activity)
  }

  @Patch(':id/policy')
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'Change the enforcement policy of an activity' })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async policy(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityPolicyRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.updatePolicy.execute(user.id, id, dto)
    return ExamActivityDto.of(activity)
  }

  @Post(':id/token/rotate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({
    summary: 'Invalidate the previous access code of an activity',
  })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async rotate(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamActivityDto> {
    const activity = await this.rotateToken.execute(user.id, id)
    return ExamActivityDto.of(activity)
  }
}
