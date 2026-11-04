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
import { MyDashboardResponseDto } from './dto/response/my-dashboard-response.dto.js'
import { GetMyDashboardUseCase } from '../../application/use-cases/get-my-dashboard/get-my-dashboard.use-case.js'

@ApiTags('Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboards')
export class MyDashboardController {
  constructor(private readonly getMyDashboard: GetMyDashboardUseCase) {}

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
}
