import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { AssignSupervisorUseCase } from '../../application/use-cases/assign-supervisor/assign-supervisor.use-case.js'
import { ListSupervisorsUseCase } from '../../application/use-cases/list-supervisors/list-supervisors.use-case.js'
import { ManageExamRoomsUseCase } from '../../application/use-cases/manage-exam-rooms/manage-exam-rooms.use-case.js'
import { RoomAccessCodeService } from '../../application/room-access-code.service.js'
import { IExamRoomRepository } from '../../domain/repositories/exam-room.repository.js'
import type { MakeupReason } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { SubstituteSupervisorUseCase } from '../../application/use-cases/substitute-supervisor/substitute-supervisor.use-case.js'
import { AllowWebClientUseCase } from '../../../exam-session/application/use-cases/allow-web-client/allow-web-client.use-case.js'
import { AllowLateEntryUseCase } from '../../../exam-session/application/use-cases/allow-late-entry/allow-late-entry.use-case.js'
import { ExtendRoomTimeUseCase } from '../../application/use-cases/extend-room-time/extend-room-time.use-case.js'
import { GetRoomMonitorUseCase } from '../../application/use-cases/get-room-monitor/get-room-monitor.use-case.js'
import { ListRoomsOverviewUseCase } from '../../application/use-cases/list-rooms-overview/list-rooms-overview.use-case.js'
import { GetRoomReportUseCase } from '../../application/use-cases/get-room-report/get-room-report.use-case.js'
import { SaveRoomReportUseCase } from '../../application/use-cases/save-room-report/save-room-report.use-case.js'
import { SubmitRoomReportUseCase } from '../../application/use-cases/submit-room-report/submit-room-report.use-case.js'
import { VerifyRoomReportUseCase } from '../../application/use-cases/verify-room-report/verify-room-report.use-case.js'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../application/room-access.service.js'
import {
  AssignSeatsDto,
  ExamRoomDto,
  ExamRoomSeatDto,
  RoomAccessCodeDto,
  UpdateExamRoomDto,
} from './dto/exam-room.dto.js'
import {
  RecordRoomAbsenceDto,
  RecordRoomFieldNoteDto,
  RoomMonitorQueryDto,
  RoomMonitorResponseDto,
  RoomOverviewDto,
  RoomOverviewQueryDto,
  RoomReportDto,
  UpdateRoomReportDto,
} from './dto/room-monitor.dto.js'
import {
  AssignSupervisorDto,
  AuditLogDto,
  ExtendRoomTimeDto,
  RecoveryReasonDto,
  RecoverySessionListDto,
  SeatFlagDto,
  SubstituteSupervisorDto,
  SupervisorSlotDto,
} from '../../../exam-session/presentation/http/dto/recovery.dto.js'

@ApiTags('Exam Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-rooms/:roomId')
export class ExamRoomController {
  constructor(
    private readonly listSupervisors: ListSupervisorsUseCase,
    private readonly assignSupervisorSlot: AssignSupervisorUseCase,
    private readonly substituteSupervisor: SubstituteSupervisorUseCase,
    private readonly allowWeb: AllowWebClientUseCase,
    private readonly allowLate: AllowLateEntryUseCase,
    private readonly extendRoom: ExtendRoomTimeUseCase,
    private readonly manageRooms: ManageExamRoomsUseCase,
    private readonly roomCodes: RoomAccessCodeService,
    private readonly roomStore: IExamRoomRepository,
    private readonly access: RoomAccessService,
    private readonly monitor: GetRoomMonitorUseCase,
    private readonly overview: ListRoomsOverviewUseCase,
    private readonly getReport: GetRoomReportUseCase,
    private readonly saveReport: SaveRoomReportUseCase,
    private readonly submitReport: SubmitRoomReportUseCase,
    private readonly verifyReport: VerifyRoomReportUseCase,
  ) {}

  @Get('monitor')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({
    summary: 'The paginated real-time participant roster of this room',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RoomMonitorResponseDto })
  async roomMonitor(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: RoomMonitorQueryDto,
  ): Promise<RoomMonitorResponseDto> {
    return RoomMonitorResponseDto.fromDomain(
      await this.monitor.execute(user, roomId, query),
    )
  }

  @Get('reports/:slotId')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({
    summary: 'The Berita Acara of one supervisor slot, filled from the room',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RoomReportDto })
  async roomReport(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ): Promise<RoomReportDto> {
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Put('reports/:slotId')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'Save the Berita Acara draft of one slot' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RoomReportDto })
  async saveRoomReport(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() body: UpdateRoomReportDto,
  ): Promise<RoomReportDto> {
    await this.saveReport.execute(user, roomId, slotId, {
      condition: body.condition,
      incidentNotes: body.incidentNotes,
      reopen: body.reopen,
    })
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Post('reports/:slotId/absences')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'Record why one student did not sit the exam' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 201, type: RoomReportDto })
  async recordRoomAbsence(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() body: RecordRoomAbsenceDto,
  ): Promise<RoomReportDto> {
    await this.saveReport.recordAbsence(user, roomId, slotId, {
      studentId: body.studentId,
      scheduleId: body.scheduleId,
      reason: body.reason as MakeupReason,
      note: body.note ?? null,
    })
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Post('reports/:slotId/field-notes')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({ summary: 'Record a field note against one student' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 201, type: RoomReportDto })
  async recordRoomFieldNote(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() body: RecordRoomFieldNoteDto,
  ): Promise<RoomReportDto> {
    await this.saveReport.recordFieldNote(user, roomId, slotId, {
      studentId: body.studentId,
      sessionId: body.sessionId ?? null,
      category: body.category,
      note: body.note,
    })
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Post('reports/:slotId/submit')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'Hand the Berita Acara in and lock it' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 201, type: RoomReportDto })
  async submitRoomReport(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ): Promise<RoomReportDto> {
    await this.submitReport.execute(user, roomId, slotId)
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Post('reports/:slotId/verify')
  @RequirePermissions('exam-rooms.manage-all')
  @ApiOperation({ summary: 'Verify a submitted Berita Acara' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 201, type: RoomReportDto })
  async verifyRoomReport(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ): Promise<RoomReportDto> {
    await this.verifyReport.execute(user, roomId, slotId)
    return RoomReportDto.fromDomain(
      await this.getReport.execute(user, roomId, slotId),
    )
  }

  @Get('access-code')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'The rotating token students type to enter this room',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RoomAccessCodeDto })
  async accessCode(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<RoomAccessCodeDto> {
    const room = await this.access.assertCanSupervise(user, roomId, new Date())
    const derived = this.roomCodes.codeFor(
      room.id,
      room.tokenRotation,
      new Date(),
    )
    const dto = new RoomAccessCodeDto()
    dto.accessCode = derived.code
    dto.rotation = room.tokenRotation
    dto.expiresAt = derived.expiresAt.toISOString()
    return dto
  }

  @Post('rotate-token')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Invalidate the current room token and hand out the next one',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 201, type: RoomAccessCodeDto })
  async rotateToken(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: RecoveryReasonDto,
  ): Promise<RoomAccessCodeDto> {
    await this.access.assertCanActAsTechnician(user, roomId)
    const room = await this.manageRooms.rotateToken(roomId, user, body.reason)
    const derived = this.roomCodes.codeFor(
      room.id,
      room.tokenRotation,
      new Date(),
    )
    const dto = new RoomAccessCodeDto()
    dto.accessCode = derived.code
    dto.rotation = room.tokenRotation
    dto.expiresAt = derived.expiresAt.toISOString()
    return dto
  }

  @Patch()
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Change a room' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ExamRoomDto })
  async update(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateExamRoomDto,
  ): Promise<ExamRoomDto> {
    return ExamRoomDto.fromDomain(
      await this.manageRooms.update(roomId, {
        code: dto.code,
        name: dto.name,
        building: dto.building,
        capacity: dto.capacity,
        technicianUserId: dto.technicianUserId,
      }),
    )
  }

  @Get('seats')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'The students seated in this room' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [ExamRoomSeatDto] })
  async seats(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ExamRoomSeatDto[]> {
    await this.access.assertCanSupervise(user, roomId, new Date())
    return (await this.manageRooms.listSeats(roomId)).map((seat) => {
      const row = new ExamRoomSeatDto()
      row.studentId = seat.studentId
      row.classroomId = seat.classroomId
      row.seatNumber = seat.seatNumber
      return row
    })
  }

  @Get('audit-logs')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'The recovery actions taken in this room' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AuditLogDto] })
  async auditLogs(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<AuditLogDto[]> {
    await this.access.assertCanSupervise(user, roomId, new Date())
    return (await this.manageRooms.listAuditLogs(roomId)).map((row) =>
      AuditLogDto.fromDomain(row),
    )
  }

  @Post('seats')
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Seat one student in this room' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 201, type: [ExamRoomSeatDto] })
  async assignSeat(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: AssignSeatsDto,
  ): Promise<ExamRoomSeatDto[]> {
    const room = await this.roomStore.findRoomById(roomId)
    if (room === null)
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    if (dto.roomIds !== undefined && dto.roomIds.length > 0) {
      const distributed = await this.manageRooms.distribute({
        eventId: room.eventId,
        roomIds: dto.roomIds,
        students: dto.students.map((student) => ({
          studentId: student.studentId,
          classroomId: student.classroomId,
        })),
        interleaveByClassroom: dto.interleaveByClassroom ?? false,
      })
      return distributed.assigned.map((seat) => {
        const row = new ExamRoomSeatDto()
        row.studentId = seat.studentId
        row.classroomId = seat.classroomId
        row.seatNumber = seat.seatNumber
        return row
      })
    }
    const created = await this.manageRooms.assignSeats(
      dto.students.map((student, index) => ({
        roomId,
        eventId: room.eventId,
        studentId: student.studentId,
        classroomId: student.classroomId,
        seatNumber: student.seatNumber ?? index + 1,
      })),
    )
    return created.map((seat) => {
      const row = new ExamRoomSeatDto()
      row.studentId = seat.studentId
      row.classroomId = seat.classroomId
      row.seatNumber = seat.seatNumber
      return row
    })
  }

  @Get('supervisors')
  @RequireAnyPermission('exam-rooms.supervise', 'exam-rooms.manage-all')
  @ApiOperation({ summary: 'The supervisor slots of a room' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [SupervisorSlotDto] })
  async supervisors(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<SupervisorSlotDto[]> {
    return (await this.listSupervisors.execute(user, roomId)).map((slot) =>
      SupervisorSlotDto.fromDomain(slot),
    )
  }

  @Post('supervisors')
  @RequirePermissions('exam-events.manage')
  @ApiOperation({ summary: 'Put a supervisor on duty for one slot' })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SupervisorSlotDto })
  async assignSupervisor(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: AssignSupervisorDto,
  ): Promise<SupervisorSlotDto> {
    return SupervisorSlotDto.fromDomain(
      await this.assignSupervisorSlot.execute(user, {
        roomId,
        scheduledUserId: dto.scheduledUserId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        reason: dto.reason,
      }),
    )
  }

  @Post('supervisors/:slotId/substitute')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Hand a supervisor slot to someone else, with reason',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'slotId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SupervisorSlotDto })
  async substitute(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: SubstituteSupervisorDto,
  ): Promise<SupervisorSlotDto> {
    return SupervisorSlotDto.fromDomain(
      await this.substituteSupervisor.execute(user, {
        roomId,
        slotId,
        actualUserId: dto.actualUserId,
        reason: dto.reason,
      }),
    )
  }

  @Post('seats/:studentId/allow-web')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Let one student take the exam from a browser for this room',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SeatFlagDto })
  async allowWebClient(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: RecoveryReasonDto,
  ): Promise<SeatFlagDto> {
    const flagged = await this.allowWeb.execute(user, {
      roomId,
      studentId,
      reason: dto.reason,
    })
    const row = new SeatFlagDto()
    row.studentId = flagged.studentId
    row.allowWebClient = flagged.allowWebClient
    row.allowLateEntry = flagged.allowLateEntry
    return row
  }

  @Post('seats/:studentId/allow-late')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Let one student start past the lateness tolerance',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiParam({ name: 'studentId', format: 'uuid' })
  @ApiResponse({ status: 201, type: SeatFlagDto })
  async allowLateEntry(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: RecoveryReasonDto,
  ): Promise<SeatFlagDto> {
    const flagged = await this.allowLate.execute(user, {
      roomId,
      studentId,
      reason: dto.reason,
    })
    const row = new SeatFlagDto()
    row.studentId = flagged.studentId
    row.allowWebClient = flagged.allowWebClient
    row.allowLateEntry = flagged.allowLateEntry
    return row
  }

  @Post('extend-time')
  @HttpCode(200)
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  @ApiOperation({
    summary: 'Add compensation minutes to every running session in a room',
  })
  @ApiParam({ name: 'roomId', format: 'uuid' })
  @ApiResponse({ status: 200, type: RecoverySessionListDto })
  async extendTime(
    @CurrentUser() user: RoomStaffUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: ExtendRoomTimeDto,
  ): Promise<RecoverySessionListDto> {
    return RecoverySessionListDto.fromDomain(
      await this.extendRoom.execute(user, roomId, dto.minutes, dto.reason),
    )
  }
}

@ApiTags('Exam Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-rooms')
export class ExamRoomOverviewController {
  constructor(private readonly overview: ListRoomsOverviewUseCase) {}

  @Get('overview')
  @RequireAnyPermission(
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  )
  @ApiOperation({
    summary: 'Every active room, or only the rooms the caller staffs',
  })
  @ApiResponse({ status: 200, type: [RoomOverviewDto] })
  async list(
    @CurrentUser() user: RoomStaffUser,
    @Query() query: RoomOverviewQueryDto,
  ): Promise<RoomOverviewDto[]> {
    return (await this.overview.execute(user, query)).map((row) =>
      RoomOverviewDto.fromDomain(row),
    )
  }
}
