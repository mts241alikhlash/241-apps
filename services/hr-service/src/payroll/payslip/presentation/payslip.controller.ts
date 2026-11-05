import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseFilters,
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
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { PayrollAccessFilter } from '../../shared/filters/payroll-access.filter.js'
import { LatestPayslipPeriodResponseDto } from '../dto/response/latest-payslip-period.response.dto.js'
import { GetMyLatestPayslipPeriodUseCase } from '../use-cases/get-my-latest-payslip-period.use-case.js'
import { MyPayslipQueryDto } from '../dto/request/my-payslip-query.dto.js'
import {
  PayslipResponseDto,
  PayslipSummaryResponseDto,
} from '../dto/response/payslip.response.dto.js'
import { GetMyPayslipUseCase } from '../use-cases/get-my-payslip.use-case.js'
import {
  GetPayslipByIdUseCase,
  GetRunPayslipsUseCase,
} from '../use-cases/get-payslip-by-id.use-case.js'

@ApiTags('Payroll — Payslips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseFilters(PayrollAccessFilter)
@Controller('payroll')
export class PayslipController {
  constructor(
    private readonly getMine: GetMyPayslipUseCase,
    private readonly getLatestPeriod: GetMyLatestPayslipPeriodUseCase,
    private readonly getById: GetPayslipByIdUseCase,
    private readonly getForRun: GetRunPayslipsUseCase,
  ) {}

  @Get('payslips/me')
  @RequirePermissions('payroll-payslips.read-own')
  @ApiOperation({
    summary: 'My payslip — resolved from the token, approved runs only',
  })
  async mine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyPayslipQueryDto,
  ): Promise<PayslipResponseDto> {
    return this.getMine.execute(user.id, query)
  }

  @Get('payslips/me/latest-period')
  @RequirePermissions('payroll-payslips.read-own')
  @ApiOperation({
    summary: 'Period of my newest approved payslip, without amounts or audit',
  })
  @ApiResponse({ status: 200, type: LatestPayslipPeriodResponseDto })
  async latestPeriod(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LatestPayslipPeriodResponseDto | null> {
    return LatestPayslipPeriodResponseDto.fromDomain(
      await this.getLatestPeriod.execute(user.id),
    )
  }

  @Get('payslips/:id')
  @RequirePermissions('payroll-payslips.read')
  @ApiParam({ name: 'id', format: 'uuid' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    return this.getById.execute(id, user.id)
  }

  @Get('runs/:id/payslips')
  @RequirePermissions('payroll-payslips.read')
  @ApiParam({ name: 'id', format: 'uuid' })
  async forRun(
    @Param('id', ParseUUIDPipe) runId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PayslipSummaryResponseDto[]> {
    return this.getForRun.execute(runId, user.id)
  }
}
