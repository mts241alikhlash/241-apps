import { Controller, Get, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import { InstitutionDashboardResponseDto } from './dto/response/institution-dashboard-response.dto.js'
import { GetInstitutionDashboardUseCase } from '../../application/use-cases/get-institution-dashboard/get-institution-dashboard.use-case.js'
import { MyDashboardResponseDto } from './dto/response/my-dashboard-response.dto.js'
import { GetMyDashboardUseCase } from '../../application/use-cases/get-my-dashboard/get-my-dashboard.use-case.js'

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class MyDashboardController {
  constructor(
    private readonly getMyDashboard: GetMyDashboardUseCase,
    private readonly getInstitution: GetInstitutionDashboardUseCase,
  ) {}

  @Get('me')
  @RequirePermissions('dashboards.read-own')
  @ApiOperation({
    summary: 'Your own dashboard — as a student, an employee, or both',
  })
  @ApiResponse({ status: 200, type: MyDashboardResponseDto })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MyDashboardResponseDto> {
    return this.getMyDashboard.execute(user.id)
  }

  @Get('institution')
  @RequirePermissions('dashboards.read')
  @ApiOperation({
    summary: 'School-wide dashboard: scores, attendance today, report cards',
  })
  @ApiResponse({ status: 200, type: InstitutionDashboardResponseDto })
  async findInstitution(): Promise<InstitutionDashboardResponseDto> {
    return InstitutionDashboardResponseDto.fromDomain(
      await this.getInstitution.execute(),
    )
  }
}
