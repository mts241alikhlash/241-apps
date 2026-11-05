import { ApiProperty } from '@nestjs/swagger'
import type { AttendanceToday } from '../../use-cases/get-attendance-today.use-case.js'
import type { MyPresenceDashboard } from '../../use-cases/get-my-presence-dashboard.use-case.js'

export class AttendanceTodayResponseDto {
  @ApiProperty({ type: Number })
  present!: number

  @ApiProperty({ type: Number })
  late!: number

  @ApiProperty({ type: Number })
  onLeave!: number

  @ApiProperty({ type: Number })
  notScanned!: number

  @ApiProperty({ type: String, format: 'date-time' })
  date!: string

  static fromDomain(domain: AttendanceToday): AttendanceTodayResponseDto {
    const dto = new AttendanceTodayResponseDto()
    dto.present = domain.present
    dto.late = domain.late
    dto.onLeave = domain.onLeave
    dto.notScanned = domain.notScanned
    dto.date = domain.date.toISOString()
    return dto
  }
}

export class PendingLeavesResponseDto {
  @ApiProperty({ type: Number })
  total!: number

  static fromDomain(domain: { total: number }): PendingLeavesResponseDto {
    const dto = new PendingLeavesResponseDto()
    dto.total = domain.total
    return dto
  }
}

export class MyPresenceTodayResponseDto {
  @ApiProperty({ type: String })
  status!: string

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  clockIn!: string | null

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  clockOut!: string | null
}

export class MyLeaveBalanceResponseDto {
  @ApiProperty({ type: String })
  leaveTypeName!: string

  @ApiProperty({ type: Number })
  remainingDays!: number
}

export class MyPresenceDashboardResponseDto {
  @ApiProperty({ type: () => MyPresenceTodayResponseDto, nullable: true })
  today!: MyPresenceTodayResponseDto | null

  @ApiProperty({ type: () => [MyLeaveBalanceResponseDto] })
  leaveBalance!: MyLeaveBalanceResponseDto[]

  static fromDomain(
    domain: MyPresenceDashboard,
  ): MyPresenceDashboardResponseDto {
    const dto = new MyPresenceDashboardResponseDto()
    dto.today = domain.today
      ? {
          status: domain.today.status,
          clockIn: domain.today.clockIn?.toISOString() ?? null,
          clockOut: domain.today.clockOut?.toISOString() ?? null,
        }
      : null
    dto.leaveBalance = domain.leaveBalance.map((row) => ({
      leaveTypeName: row.leaveTypeName,
      remainingDays: row.remainingDays,
    }))
    return dto
  }
}
