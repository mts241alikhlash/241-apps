import {
  Body,
  Controller,
  Get,
  Header,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import { RequireAnyPermission } from '@mts241alikhlash/nest-core/access-control'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import {
  MANAGE_ALL,
  READ_ALL,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../application/room-access.service.js'
import { ManageExamEventsUseCase } from '../../application/use-cases/manage-exam-events/manage-exam-events.use-case.js'
import { ManageExamRoomsUseCase } from '../../application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import { GetPrintPackUseCase } from '../../application/use-cases/get-print-pack/get-print-pack.use-case.js'
import { ResetEventCredentialsUseCase } from '../../application/use-cases/reset-event-credentials/reset-event-credentials.use-case.js'
import { GenerateSeatsUseCase } from '../../application/use-cases/generate-seats/generate-seats.use-case.js'
import { GenerateRoomSlotsUseCase } from '../../application/use-cases/generate-room-slots/generate-room-slots.use-case.js'
import {
  CreateExamEventDto,
  CreateExamRoomDto,
  ExamRoomDto,
  ExamEventDto,
  ExamEventListResponseDto,
  ExamEventQueryDto,
  GenerateRoomSlotsResponseDto,
  GenerateSeatsBodyDto,
  GenerateSeatsResponseDto,
  UpdateExamEventDto,
} from './dto/exam-room.dto.js'
import { PrintPackDto, PrintPackQueryDto } from './dto/print-pack.dto.js'
import {
  ResetCredentialsBodyDto,
  ResetCredentialsDto,
} from './dto/reset-credentials.dto.js'

@ApiTags('Exam Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-events')
export class ExamEventController {
  constructor(
    private readonly events: ManageExamEventsUseCase,
    private readonly rooms: ManageExamRoomsUseCase,
    private readonly printPack: GetPrintPackUseCase,
    private readonly resetCredentials: ResetEventCredentialsUseCase,
    private readonly seatGeneration: GenerateSeatsUseCase,
    private readonly roomSlotGeneration: GenerateRoomSlotsUseCase,
  ) {}

  @Get()
  @RequireAnyPermission(
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'The exam events of a semester' })
  @ApiResponse({ status: 200, type: ExamEventListResponseDto })
  async list(
    @CurrentUser() user: RoomStaffUser,
    @Query() query: ExamEventQueryDto,
  ): Promise<ExamEventListResponseDto> {
    const readsAll =
      user.permissions?.includes('exam-events.read') === true ||
      user.permissions?.includes(READ_ALL) === true ||
      user.permissions?.includes(MANAGE_ALL) === true
    return ExamEventListResponseDto.fromDomain(
      await this.events.list({
        ...query,
        staffedOnly: readsAll
          ? undefined
          : {
              userId: user.id,
              from: new Date(),
              supervise: user.permissions?.includes(SUPERVISE) === true,
              technician: user.permissions?.includes(TECHNICIAN) === true,
            },
      }),
    )
  }

  @Get(':id')
  @RequireAnyPermission(
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'One exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamEventDto })
  async findOne(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamEventDto> {
    return ExamEventDto.fromDomain(await this.events.getForUser(user, id))
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
        type: dto.type,
        startsAt:
          dto.startsAt === undefined ? undefined : new Date(dto.startsAt),
        endsAt: dto.endsAt === undefined ? undefined : new Date(dto.endsAt),
        lateToleranceMinutes: dto.lateToleranceMinutes,
        minSubmitMinutes: dto.minSubmitMinutes,
        status: dto.status,
      }),
    )
  }

  @Get(':id/rooms')
  @RequireAnyPermission(
    'exam-events.read',
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.read-all',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'The rooms of an exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [ExamRoomDto] })
  async roomsOfEvent(
    @CurrentUser() user: RoomStaffUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExamRoomDto[]> {
    await this.events.getForUser(user, id)
    return (await this.rooms.listForUser(user, id)).map((room) =>
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

  @Get(':id/print-pack')
  @RequireAnyPermission('exam-events.manage', 'exam-events.read')
  @ApiOperation({ summary: 'The print pack of an exam event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'roomId', required: false, format: 'uuid' })
  @ApiResponse({ status: 200, type: PrintPackDto })
  async getPrintPack(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PrintPackQueryDto,
  ): Promise<PrintPackDto> {
    return PrintPackDto.fromDomain(
      await this.printPack.execute(id, query.roomId),
    )
  }

  @Post(':id/credentials/reset')
  @RequirePermissions('exam-events.manage')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'Give every seated student of an event a new login password, shown once',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'roomId', required: false, format: 'uuid' })
  @ApiResponse({ status: 200, type: ResetCredentialsDto })
  async resetPasswords(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PrintPackQueryDto,
    @Body() _body: ResetCredentialsBodyDto,
  ): Promise<ResetCredentialsDto> {
    return ResetCredentialsDto.fromDomain(
      await this.resetCredentials.execute(id, user.id, query.roomId),
    )
  }

  @Post(':id/seats/generate')
  @RequirePermissions('exam-events.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Plan the seats of an exam event; with mode apply, write them in place of the existing seats',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: GenerateSeatsResponseDto })
  async generateSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateSeatsBodyDto,
  ): Promise<GenerateSeatsResponseDto> {
    return GenerateSeatsResponseDto.fromDomain(
      await this.seatGeneration.execute({
        eventId: id,
        mode: dto.mode,
        replaceExisting: dto.replaceExisting ?? false,
        students: dto.students,
        roomIds: dto.roomIds,
        rules: dto.rules ?? {},
      }),
    )
  }

  @Post(':id/supervisor-slots/generate')
  @RequirePermissions('exam-events.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Create one empty supervisor slot per room and timetable window of an exam event',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: GenerateRoomSlotsResponseDto })
  async generateSupervisorSlots(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GenerateRoomSlotsResponseDto> {
    return GenerateRoomSlotsResponseDto.fromDomain(
      await this.roomSlotGeneration.execute(id),
    )
  }
}
