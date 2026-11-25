import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { ReplaceRdmSettingUseCase } from '../../application/use-cases/replace-rdm-setting.use-case.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import { ReplaceRdmSettingDto } from './dto/request/replace-rdm-setting.dto.js'
import { RdmSettingResponseDto } from './dto/response/rdm-setting-response.dto.js'

@ApiTags('RDM Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment-settings/rdm')
export class RdmSettingController {
  constructor(
    private readonly rdmSettingRepository: IRdmSettingRepository,
    private readonly replaceRdmSetting: ReplaceRdmSettingUseCase,
  ) {}

  @Get()
  @RequirePermissions('assessment-settings.read')
  @ApiOperation({ summary: 'Get school-wide RDM settings' })
  @ApiResponse({ status: 200, type: RdmSettingResponseDto })
  async get(): Promise<RdmSettingResponseDto> {
    return RdmSettingResponseDto.fromDomain(
      await this.rdmSettingRepository.get(),
    )
  }

  @Put()
  @RequirePermissions('assessment-settings.update')
  @ApiOperation({ summary: 'Replace school-wide RDM settings' })
  @ApiResponse({ status: 200, type: RdmSettingResponseDto })
  async replace(
    @Body() dto: ReplaceRdmSettingDto,
  ): Promise<RdmSettingResponseDto> {
    return RdmSettingResponseDto.fromDomain(
      await this.replaceRdmSetting.execute({
        sumatifTypes: dto.sumatifTypes,
        sasType: dto.sasType,
      }),
    )
  }
}
