import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser, Public } from '@mts241alikhlash/nest-core/decorators'
import {
  ManageSebConfigsUseCase,
  SEB_CONFIG_MAX_BYTES,
} from '../../application/use-cases/manage-seb-configs/manage-seb-configs.use-case.js'
import {
  SEB_ALLOWED_ORIGINS,
  SebVerifier,
} from '../../application/seb-verifier.service.js'
import {
  ActiveSebConfigDto,
  CheckSebRequestDto,
  CheckSebResponseDto,
  CreateSebConfigDto,
  GenerateSebConfigDto,
  SebConfigDto,
  UpdateSebConfigDto,
} from './dto/seb-config.dto.js'

@ApiTags('Safe Exam Browser')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seb-configs')
export class SebConfigController {
  constructor(
    private readonly configs: ManageSebConfigsUseCase,
    private readonly verifier: SebVerifier,
    @Inject(SEB_ALLOWED_ORIGINS) private readonly allowedOrigins: string[],
  ) {}

  @Get()
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'List Safe Exam Browser configurations' })
  @ApiResponse({ status: 200, type: [SebConfigDto] })
  async list(): Promise<SebConfigDto[]> {
    return (await this.configs.list()).map((c) => SebConfigDto.fromDomain(c))
  }

  @Get('active')
  @RequirePermissions('exam-sessions.take')
  @ApiOperation({
    summary: 'List active configurations for the student client',
  })
  @ApiResponse({ status: 200, type: [ActiveSebConfigDto] })
  async listActive(): Promise<ActiveSebConfigDto[]> {
    return (await this.configs.listActive()).map((c) =>
      ActiveSebConfigDto.fromDomain(c),
    )
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'Check a Safe Exam Browser config key hash' })
  @ApiResponse({ status: 200, type: CheckSebResponseDto })
  async check(@Body() dto: CheckSebRequestDto): Promise<CheckSebResponseDto> {
    const result = await this.verifier.verify(dto.seb)
    return { matched: result.verified, configName: result.configName }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('exam-schedules.manage-all')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: SEB_CONFIG_MAX_BYTES + 1, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Store a Safe Exam Browser configuration (.seb, 1 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, type: SebConfigDto })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSebConfigDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<SebConfigDto> {
    if (!file)
      throw new BadRequestException('Berkas konfigurasi wajib dilampirkan')
    return SebConfigDto.fromDomain(
      await this.configs.create(user.id, {
        name: dto.name,
        configKey: dto.configKey,
        originalName: file.originalname,
        file: file.buffer,
      }),
    )
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({
    summary:
      'Build a .seb that starts on the student exam list of the calling app and register its Config Key',
  })
  @ApiResponse({ status: 201, type: SebConfigDto })
  async generate(
    @CurrentUser() user: { id: string },
    @Headers('origin') origin: string | undefined,
    @Body() dto: GenerateSebConfigDto,
  ): Promise<SebConfigDto> {
    if (!origin || !this.allowedOrigins.includes(origin)) {
      throw new BadRequestException('Buat konfigurasi dari aplikasi ujian')
    }
    return SebConfigDto.fromDomain(
      await this.configs.generate(user.id, {
        name: dto.name,
        startUrl: `${origin}/my-exams`,
        quitPassword: dto.quitPassword,
      }),
    )
  }

  @Patch(':id')
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'Rename or activate/deactivate a configuration' })
  @ApiResponse({ status: 200, type: SebConfigDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSebConfigDto,
  ): Promise<SebConfigDto> {
    return SebConfigDto.fromDomain(await this.configs.update(id, dto))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('exam-schedules.manage-all')
  @ApiOperation({ summary: 'Delete a configuration and its file' })
  @ApiResponse({ status: 204, description: 'Configuration deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.configs.remove(id)
  }
}

@ApiTags('Safe Exam Browser')
@Controller('public/seb-configs')
export class SebConfigFileController {
  constructor(private readonly configs: ManageSebConfigsUseCase) {}

  @Get(':id/file')
  @Public()
  @ApiOperation({ summary: 'Download an active .seb configuration file' })
  @ApiResponse({
    status: 200,
    description: 'The .seb file',
    schema: { type: 'string', format: 'binary' },
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream } = await this.configs.file(id)
    res.set({
      'Content-Type': 'application/seb',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    })
    return new StreamableFile(stream)
  }
}
