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
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CancelExamScheduleUseCase } from '../../application/use-cases/cancel-exam-schedule/cancel-exam-schedule.use-case.js'
import { CreateExamScheduleUseCase } from '../../application/use-cases/create-exam-schedule/create-exam-schedule.use-case.js'
import { GetAccessCodeUseCase } from '../../application/use-cases/get-access-code/get-access-code.use-case.js'
import { GetExamScheduleUseCase } from '../../application/use-cases/get-exam-schedule/get-exam-schedule.use-case.js'
import { ListExamSchedulesUseCase } from '../../application/use-cases/list-exam-schedules/list-exam-schedules.use-case.js'
import { RotateAccessCodeUseCase } from '../../application/use-cases/rotate-access-code/rotate-access-code.use-case.js'
import { UpdateExamScheduleUseCase } from '../../application/use-cases/update-exam-schedule/update-exam-schedule.use-case.js'
import {
  CreateExamScheduleDto,
  ExamScheduleQueryDto,
  UpdateExamScheduleDto,
} from './dto/request/exam-schedule-request.dto.js'
import {
  AccessCodeDto,
  ExamScheduleDto,
  ExamScheduleListResponseDto,
} from './dto/response/exam-schedule-response.dto.js'

@ApiTags('Exam Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-schedules')
export class ExamScheduleController {
  constructor(
    private readonly listSchedules: ListExamSchedulesUseCase,
    private readonly getSchedule: GetExamScheduleUseCase,
    private readonly createSchedule: CreateExamScheduleUseCase,
    private readonly updateSchedule: UpdateExamScheduleUseCase,
    private readonly cancelSchedule: CancelExamScheduleUseCase,
    private readonly getCode: GetAccessCodeUseCase,
    private readonly rotateCode: RotateAccessCodeUseCase,
  ) {}

  @Get()
  @RequirePermissions('exam-schedules.read')
  @ApiOperation({ summary: 'List exam schedules' })
  @ApiResponse({ status: 200, type: ExamScheduleListResponseDto })
  async findAll(
    @Query() query: ExamScheduleQueryDto,
  ): Promise<ExamScheduleListResponseDto> {
    return ExamScheduleListResponseDto.fromDomain(
      await this.listSchedules.execute({
        ...query,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      }),
    )
  }

  @Get(':id')
  @RequirePermissions('exam-schedules.read')
  @ApiOperation({ summary: 'Get an exam schedule' })
  @ApiResponse({ status: 200, type: ExamScheduleDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamScheduleDto> {
    return ExamScheduleDto.fromDomain(await this.getSchedule.execute(id))
  }

  @Post()
  @RequirePermissions('exam-schedules.create')
  @ApiOperation({
    summary: 'Schedule a package for a classroom and lock the package',
  })
  @ApiResponse({ status: 201, type: ExamScheduleDto })
  async create(
    @CurrentUser() user: { id: string; permissions: string[] },
    @Body() dto: CreateExamScheduleDto,
  ): Promise<ExamScheduleDto> {
    return ExamScheduleDto.fromDomain(
      await this.createSchedule.execute(
        {
          id: user.id,
          manageAll: user.permissions.includes('exam-schedules.manage-all'),
        },
        {
          packageId: dto.packageId,
          classroomId: dto.classroomId,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          durationMinutes: dto.durationMinutes,
          minSubmitMinutes: dto.minSubmitMinutes,
          type: dto.type,
          eventId: dto.eventId,
        },
      ),
    )
  }

  @Patch(':id')
  @RequirePermissions('exam-schedules.update')
  @ApiOperation({ summary: 'Change the window and duration of a schedule' })
  @ApiResponse({ status: 200, type: ExamScheduleDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { permissions: string[] },
    @Body() dto: UpdateExamScheduleDto,
  ): Promise<ExamScheduleDto> {
    return ExamScheduleDto.fromDomain(
      await this.updateSchedule.execute(
        id,
        {
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          durationMinutes: dto.durationMinutes,
          minSubmitMinutes: dto.minSubmitMinutes,
          type: dto.type,
          eventId: dto.eventId,
        },
        user.permissions.includes('exam-schedules.manage-all'),
      ),
    )
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('exam-schedules.cancel')
  @ApiOperation({ summary: 'Cancel a schedule' })
  @ApiResponse({ status: 204 })
  @ApiParam({ name: 'id', format: 'uuid' })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.cancelSchedule.execute(id)
  }

  @Get(':id/access-code')
  @RequirePermissions('exam-schedules.access-code')
  @ApiOperation({ summary: 'The access code students enter to start' })
  @ApiResponse({ status: 200, type: AccessCodeDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  async accessCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccessCodeDto> {
    const result = await this.getCode.execute(id)
    return AccessCodeDto.of(
      result.accessCode,
      result.rotation,
      result.expiresAt,
      result.slotIndex,
    )
  }

  @Post(':id/access-code/rotate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.access-code')
  @ApiOperation({ summary: 'Replace the access code with a new one' })
  @ApiResponse({ status: 200, type: AccessCodeDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  async rotateAccessCode(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccessCodeDto> {
    const result = await this.rotateCode.execute(id)
    return AccessCodeDto.of(
      result.accessCode,
      result.rotation,
      result.expiresAt,
      result.slotIndex,
    )
  }
}
