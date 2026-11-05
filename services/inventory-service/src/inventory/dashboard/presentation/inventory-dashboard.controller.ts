import { Controller, Get, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import {
  AssetDashboardResponseDto,
  LoanDashboardResponseDto,
} from '../dto/inventory-dashboard-response.dto.js'
import { GetAssetDashboardUseCase } from '../use-cases/get-asset-dashboard.use-case.js'
import { GetLoanDashboardUseCase } from '../use-cases/get-loan-dashboard.use-case.js'

@ApiTags('Inventory — Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory/dashboard')
export class InventoryDashboardController {
  constructor(
    private readonly assetsUseCase: GetAssetDashboardUseCase,
    private readonly loansUseCase: GetLoanDashboardUseCase,
  ) {}

  @Get('assets')
  @RequirePermissions('inventory-assets.read')
  @ApiOperation({ summary: 'Asset units by status and by condition' })
  @ApiResponse({ status: 200, type: AssetDashboardResponseDto })
  async assets(): Promise<AssetDashboardResponseDto> {
    return AssetDashboardResponseDto.fromDomain(
      await this.assetsUseCase.execute(),
    )
  }

  @Get('loans')
  @RequirePermissions('inventory-loans.read')
  @ApiOperation({ summary: 'Active and overdue loans' })
  @ApiResponse({ status: 200, type: LoanDashboardResponseDto })
  async loans(): Promise<LoanDashboardResponseDto> {
    return LoanDashboardResponseDto.fromDomain(
      await this.loansUseCase.execute(),
    )
  }
}
