import {
  Body,
  Controller,
  Get,
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
import { RequireAnyPermission } from '@mts241alikhlash/nest-core/access-control'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { ManageExamEventsUseCase } from '../../application/use-cases/manage-exam-events/manage-exam-events.use-case.js'
import { ManageExamRoomsUseCase } from '../../application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import {
  CreateExamEventDto,
  CreateExamRoomDto,
  ExamRoomDto,
  ExamEventDto,
  ExamEventListResponseDto,
  ExamEventQueryDto,
  UpdateExamEventDto,
} from './dto/exam-room.dto.js'

@ApiTags('Exam Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-events')
export class ExamEventController {
  constructor(
    private readonly events: ManageExamEventsUseCase,
    private readonly rooms: ManageExamRoomsUseCase,
  ) {}

  @Get()
  @RequireAnyPermission('exam-events.read', 'exam-rooms.supervise')
  @ApiOperation({ summary: 'The exam events of a semester' })
  @ApiResponse({ status: 200, type: ExamEventListResponseDto })
  async list(
    @CurrentUser() user: { id: string; permissions?: string[] },
    @Query() query: ExamEventQueryDto,
  ): Promise<ExamEventListResponseDto> {
    const readsAll = user.permissions?.includes('exam-events.read') === true
    return ExamEventListResponseDto.fromDomain(
      await this.events.list({
        ...query,
        supervisedOnly: readsAll
          ? undefined
          : { userId: user.id, from: new Date() },
      }),
    )
  }

  @Get(':id')
  @RequireAnyPermission('exam-events.read', 'exam-rooms.supervise')
  @ApiOperation({ summary: 'One exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamEventDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ExamEventDto> {
    return ExamEventDto.fromDomain(await this.events.get(id))
  }

  @Post()
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Create an exam event' })
  @ApiResponse({ status: 201, type: ExamEventDto })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateExamEventDto,
  ): Promise<ExamEventDto> {
    return ExamEventDto.fromDomain(
      await this.events.create(user, {
        semesterId: dto.semesterId,
        name: dto.name,
        type: dto.type,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        lateToleranceMinutes: dto.lateToleranceMinutes,
        minSubmitMinutes: dto.minSubmitMinutes,
        requireAndroidApp: dto.requireAndroidApp,
      }),
    )
  }

  @Patch(':id')
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Change an exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamEventDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamEventDto,
  ): Promise<ExamEventDto> {
    return ExamEventDto.fromDomain(
      await this.events.update(id, {
        name: dto.name,
        startsAt:
          dto.startsAt === undefined ? undefined : new Date(dto.startsAt),
        endsAt: dto.endsAt === undefined ? undefined : new Date(dto.endsAt),
        lateToleranceMinutes: dto.lateToleranceMinutes,
        minSubmitMinutes: dto.minSubmitMinutes,
        requireAndroidApp: dto.requireAndroidApp,
        status: dto.status,
      }),
    )
  }

  @Get(':id/rooms')
  @RequireAnyPermission('exam-events.read', 'exam-rooms.supervise')
  @ApiOperation({ summary: 'The rooms of an exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [ExamRoomDto] })
  async roomsOfEvent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamRoomDto[]> {
    return (await this.rooms.list(id)).map((room) =>
      ExamRoomDto.fromDomain(room),
    )
  }

  @Post(':id/rooms')
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Add a room to an exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 201, type: ExamRoomDto })
  async createRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExamRoomDto,
  ): Promise<ExamRoomDto> {
    return ExamRoomDto.fromDomain(
      await this.rooms.create({
        eventId: id,
        code: dto.code,
        name: dto.name,
        building: dto.building ?? null,
        capacity: dto.capacity,
        technicianUserId: dto.technicianUserId ?? null,
      }),
    )
  }
}
