import { RequirePermissions } from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import {
  BadRequestException,
  Body,
  type CallHandler,
  Controller,
  type ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  type NestInterceptor,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { FillRdmTemplateUseCase } from '../../application/use-cases/fill-rdm-template.use-case.js'
import { GetRdmCandidatesUseCase } from '../../application/use-cases/get-rdm-candidates.use-case.js'
import {
  RDM_MAX_UPLOAD_BYTES,
  RDM_OCTET_STREAM_MIME,
  RDM_UPLOAD_LIMITS,
  RDM_XLSX_MIME,
} from '../../constants/rdm.constants.js'
import { FillRdmTemplateDto } from './dto/request/fill-rdm-template.dto.js'
import { RdmCandidatesQueryDto } from './dto/request/rdm-candidates-query.dto.js'
import { RdmCandidatesResponseDto } from './dto/response/rdm-candidates-response.dto.js'
import { RdmFillResponseDto } from './dto/response/rdm-fill-response.dto.js'

@Injectable()
class NormalizeItemIdsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context
      .switchToHttp()
      .getRequest<{ body?: Record<string, unknown> }>()
    if (req.body?.['itemIds[]'] !== undefined) {
      if (req.body.itemIds === undefined) {
        req.body.itemIds = req.body['itemIds[]']
      }
      delete req.body['itemIds[]']
    }
    return next.handle()
  }
}

function assertValidXlsxUpload(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new BadRequestException('File template RDM wajib dilampirkan')
  }
  if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new BadRequestException('File harus berformat .xlsx')
  }
  if (
    file.mimetype !== RDM_XLSX_MIME &&
    file.mimetype !== RDM_OCTET_STREAM_MIME
  ) {
    throw new BadRequestException('File harus berformat .xlsx')
  }
  if (file.size > RDM_MAX_UPLOAD_BYTES) {
    throw new BadRequestException('Ukuran file maksimal 2 MB')
  }
}

@ApiTags('RDM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessment-items/rdm')
export class RdmController {
  constructor(
    private readonly getRdmCandidates: GetRdmCandidatesUseCase,
    private readonly fillRdmTemplate: FillRdmTemplateUseCase,
  ) {}

  @Get('candidates')
  @RequirePermissions('assessment-items.rdm')
  @ApiOperation({
    summary: 'List assessment items offered for RDM sumatif and SAS templates',
  })
  @ApiResponse({ status: 200, type: RdmCandidatesResponseDto })
  async candidates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RdmCandidatesQueryDto,
  ): Promise<RdmCandidatesResponseDto> {
    return RdmCandidatesResponseDto.fromDomain(
      await this.getRdmCandidates.execute({
        userId: user.id,
        teachingAssignmentId: query.teachingAssignmentId,
      }),
    )
  }

  @Post('fill')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('assessment-items.rdm')
  @UseInterceptors(
    FileInterceptor('file', { limits: RDM_UPLOAD_LIMITS }),
    NormalizeItemIdsInterceptor,
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Fill an RDM Excel template with assessment items and scores',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'teachingAssignmentId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        teachingAssignmentId: { type: 'string', format: 'uuid' },
        itemIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, type: RdmFillResponseDto })
  async fill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FillRdmTemplateDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<RdmFillResponseDto> {
    assertValidXlsxUpload(file)
    return RdmFillResponseDto.fromDomain(
      await this.fillRdmTemplate.execute({
        userId: user.id,
        teachingAssignmentId: dto.teachingAssignmentId,
        file: file.buffer,
        originalFileName: file.originalname,
        itemIds: dto.itemIds,
      }),
    )
  }
}
