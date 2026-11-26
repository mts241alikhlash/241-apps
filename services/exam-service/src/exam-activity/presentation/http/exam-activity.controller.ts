import {
  Body,
  Controller,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import {
  ScheduleScopeService,
  type ScheduleAccessUser,
} from '../../../exam-schedule/application/schedule-scope.service.js'
import { AssignActivityClassroomsUseCase } from '../../application/use-cases/assign-activity-classrooms/assign-activity-classrooms.use-case.js'
import { AttachActivityPackageUseCase } from '../../application/use-cases/attach-activity-package/attach-activity-package.use-case.js'
import { CreateActivityUseCase } from '../../application/use-cases/create-activity/create-activity.use-case.js'
import { GetActivityReadinessUseCase } from '../../application/use-cases/get-activity-readiness/get-activity-readiness.use-case.js'
import { IssueParticipantNumbersUseCase } from '../../application/use-cases/issue-participant-numbers/issue-participant-numbers.use-case.js'
import { ListActivitiesUseCase } from '../../application/use-cases/list-activities/list-activities.use-case.js'
import { UpdateActivityAutoStatusUseCase } from '../../application/use-cases/update-activity-auto-status/update-activity-auto-status.use-case.js'
import { UpdateActivityStatusUseCase } from '../../application/use-cases/update-activity-status/update-activity-status.use-case.js'
import {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from '../../application/use-cases/update-activity-policy/update-activity-policy.use-case.js'
import {
  ActivityReadinessDto,
  ActivityReadinessQueryDto,
  AssignActivityClassroomsRequestDto,
  AttachActivityPackageRequestDto,
  CreateActivityRequestDto,
  ExamActivityDetailDto,
  ExamActivityDto,
  ExamActivityQueryDto,
  IssueParticipantNumbersResponseDto,
  UpdateActivityAutoStatusRequestDto,
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
    private readonly attachPackage: AttachActivityPackageUseCase,
    private readonly assignClassrooms: AssignActivityClassroomsUseCase,
    private readonly readiness: GetActivityReadinessUseCase,
    private readonly updateAutoStatus: UpdateActivityAutoStatusUseCase,
    @Inject(forwardRef(() => ScheduleScopeService))
    private readonly scheduleScope: ScheduleScopeService,
  ) {}

  @Get()
  @RequireAnyPermission(
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  )
  @ApiOperation({ summary: 'List the activities of the active semester' })
  @ApiResponse({ status: 200, type: [ExamActivityDto] })
  async list(
    @CurrentUser() user: ScheduleAccessUser,
    @Query() query: ExamActivityQueryDto,
  ): Promise<ExamActivityDto[]> {
    const rows = await this.listActivities.listNamed(user, query.category)
    return rows.map((row) => ExamActivityDto.of(row.activity, row))
  }

  @Get('readiness')
  @RequireAnyPermission(
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  )
  @ApiOperation({
    summary: 'Check what is still missing before the activities of a day',
  })
  @ApiResponse({ status: 200, type: [ActivityReadinessDto] })
  async readinessOfDay(
    @CurrentUser() user: ScheduleAccessUser,
    @Query() query: ActivityReadinessQueryDto,
  ): Promise<ActivityReadinessDto[]> {
    const rows = await this.readiness.execute(user, query)
    return rows.map((row) => ActivityReadinessDto.of(row))
  }

  @Get(':id')
  @RequireAnyPermission(
    'exam-schedules.read',
    'exam-schedules.manage',
    'exam-schedules.manage-all',
    'exam-events.read',
  )
  @ApiOperation({ summary: 'Get one activity with its classroom schedules' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamActivityDetailDto })
  async findOne(
    @CurrentUser() user: ScheduleAccessUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamActivityDetailDto> {
    const detail = await this.listActivities.findOne(id, user)
    return ExamActivityDetailDto.ofDetail(detail.activity, detail.schedules)
  }

  @Patch(':id')
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({ summary: 'Change the status of an activity' })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async changeStatus(
    @CurrentUser() user: ScheduleAccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityStatusRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.updateStatus.execute(user, id, dto.status)
    return ExamActivityDto.of(activity)
  }

  @Patch(':id/auto-status')
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({ summary: 'Switch automatic opening and closing' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async switchAutoStatus(
    @CurrentUser() user: ScheduleAccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityAutoStatusRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.updateAutoStatus.execute(
      user,
      id,
      dto.autoStatus,
    )
    return ExamActivityDto.of(activity)
  }

  @Post(':id/participant-numbers/issue')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission('exam-events.manage', 'exam-schedules.manage-all')
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
    @CurrentUser() user: ScheduleAccessUser,
    @Body() dto: CreateActivityRequestDto,
  ): Promise<ExamActivityDto> {
    const scope = await this.scheduleScope.forUser(user)
    await scope.assertCanManageActivity(
      {
        type: dto.type,
        semesterId: dto.semesterId,
        gradeId: dto.gradeId,
        subjectId: dto.subjectId,
      },
      dto.classroomIds,
    )
    const perms = user.permissions ?? []
    const activity = await this.createActivity.execute({
      actorId: user.id,
      manageAll: perms.includes('exam-schedules.manage-all'),
      canManageEvents: perms.includes('exam-events.manage'),
      semesterId: dto.semesterId,
      eventId: dto.eventId ?? null,
      gradeId: dto.gradeId,
      subjectId: dto.subjectId,
      packageId: dto.packageId ?? null,
      type: dto.type,
      classroomIds: dto.classroomIds ?? [],
      presetName: dto.presetName,
      tokenMode: dto.tokenMode,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      durationMinutes: dto.durationMinutes,
      deliveryMode: dto.deliveryMode,
      offlineKind: dto.offlineKind,
      maxScore: dto.maxScore,
      autoStatus: dto.autoStatus,
    })
    return ExamActivityDto.of(activity)
  }

  @Post(':id/package')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({
    summary: 'Attach an approved package and create the classroom schedules',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamActivityDto })
  async attach(
    @CurrentUser() user: ScheduleAccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachActivityPackageRequestDto,
  ): Promise<ExamActivityDto> {
    const activity = await this.attachPackage.execute({
      actor: user,
      activityId: id,
      packageId: dto.packageId,
      classroomIds: dto.classroomIds,
    })
    return ExamActivityDto.of(activity)
  }

  @Post(':id/classrooms')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.manage')
  @ApiOperation({
    summary: 'Create the missing classroom schedules of an activity',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamActivityDetailDto })
  async assign(
    @CurrentUser() user: ScheduleAccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignActivityClassroomsRequestDto,
  ): Promise<ExamActivityDetailDto> {
    await this.assignClassrooms.execute({
      actor: user,
      activityId: id,
      classroomIds: dto.classroomIds,
    })
    const detail = await this.listActivities.findOne(id, user)
    return ExamActivityDetailDto.ofDetail(detail.activity, detail.schedules)
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
