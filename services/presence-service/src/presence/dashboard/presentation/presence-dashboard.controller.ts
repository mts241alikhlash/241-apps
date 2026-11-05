import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import {
  AttendanceTodayResponseDto,
  MyPresenceDashboardResponseDto,
  PendingLeavesResponseDto,
} from '../dto/response/presence-dashboard-response.dto.js'
import { GetAttendanceTodayUseCase } from '../use-cases/get-attendance-today.use-case.js'
import { GetMyPresenceDashboardUseCase } from '../use-cases/get-my-presence-dashboard.use-case.js'
import { GetPendingLeavesUseCase } from '../use-cases/get-pending-leaves.use-case.js'

type CallerWithPermissions = AuthenticatedUser & { permissions?: string[] }

@ApiTags('Presence — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('presence/dashboard')
export class PresenceDashboardController {
  constructor(
    private readonly attendanceToday: GetAttendanceTodayUseCase,
    private readonly pendingLeaves: GetPendingLeavesUseCase,
    private readonly mine: GetMyPresenceDashboardUseCase,
  ) {}

  @Get('attendance-today')
  @RequirePermissions('presence-records.read')
  @ApiOperation({ summary: "Today's attendance counts for employees" })
  async attendance(): Promise<AttendanceTodayResponseDto> {
    return AttendanceTodayResponseDto.fromDomain(
      await this.attendanceToday.execute(),
    )
  }

  @Get('pending-leaves')
  @RequirePermissions('leave-requests.read')
  @ApiOperation({ summary: 'Leave requests waiting for a decision' })
  async leaves(): Promise<PendingLeavesResponseDto> {
    return PendingLeavesResponseDto.fromDomain(
      await this.pendingLeaves.execute(),
    )
  }

  @Get('me')
  @RequirePermissions('presence-records.read-own')
  @ApiOperation({
    summary: 'Your day and, with leave-requests.read-own, your leave balances',
  })
  async me(
    @CurrentUser() user: CallerWithPermissions,
  ): Promise<MyPresenceDashboardResponseDto> {
    const canReadLeave = (user.permissions ?? []).includes(
      'leave-requests.read-own',
    )
    return MyPresenceDashboardResponseDto.fromDomain(
      await this.mine.execute(user.id, canReadLeave),
    )
  }
}
