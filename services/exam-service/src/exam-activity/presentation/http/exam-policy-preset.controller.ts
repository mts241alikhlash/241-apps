import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import {
  EXAM_TYPES,
  type ExamType,
} from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { ManagePresetsUseCase } from '../../application/use-cases/manage-presets/manage-presets.use-case.js'
import { UpdateActivityPolicyRequestDto } from './dto/exam-activity.dto.js'
import { ExamPolicyPresetDto } from './dto/exam-policy-preset.dto.js'

@ApiTags('Exam Policy Presets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-policy-presets')
export class ExamPolicyPresetController {
  constructor(private readonly presets: ManagePresetsUseCase) {}

  @Get()
  @RequirePermissions('exam-schedules.read')
  @ApiOperation({ summary: 'List the default enforcement policy presets' })
  @ApiResponse({ status: 200, type: [ExamPolicyPresetDto] })
  async list(): Promise<ExamPolicyPresetDto[]> {
    return (await this.presets.list()).map((preset) =>
      ExamPolicyPresetDto.of(preset),
    )
  }

  @Patch(':type')
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'Update one policy preset' })
  @ApiParam({ name: 'type', enum: EXAM_TYPES })
  @ApiResponse({ status: 200, type: ExamPolicyPresetDto })
  async update(
    @CurrentUser() user: { id: string },
    @Param('type') type: ExamType,
    @Body() dto: UpdateActivityPolicyRequestDto,
  ): Promise<ExamPolicyPresetDto> {
    return ExamPolicyPresetDto.of(await this.presets.update(user.id, type, dto))
  }
}
