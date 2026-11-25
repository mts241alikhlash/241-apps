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
  Res,
  StreamableFile,
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
import type { Response } from 'express'
import { DownloadRdmWorkbookUseCase } from '../../application/use-cases/download-rdm-workbook.use-case.js'
import { FillRdmTemplateUseCase } from '../../application/use-cases/fill-rdm-template.use-case.js'
import { GetRdmCandidatesUseCase } from '../../application/use-cases/get-rdm-candidates.use-case.js'
import { ImportRdmWorkbookUseCase } from '../../application/use-cases/import-rdm-workbook.use-case.js'
import {
  RDM_MAX_UPLOAD_BYTES,
  RDM_OCTET_STREAM_MIME,
  RDM_UPLOAD_LIMITS,
  RDM_XLSX_MIME,
} from '../../constants/rdm.constants.js'
import { contentDisposition } from './content-disposition.js'
import { DownloadRdmWorkbookQueryDto } from './dto/request/download-rdm-workbook-query.dto.js'
import { FillRdmTemplateDto } from './dto/request/fill-rdm-template.dto.js'
import { ImportRdmWorkbookDto } from './dto/request/import-rdm-workbook.dto.js'
import { RdmCandidatesQueryDto } from './dto/request/rdm-candidates-query.dto.js'
import { RdmCandidatesResponseDto } from './dto/response/rdm-candidates-response.dto.js'
import { RdmFillResponseDto } from './dto/response/rdm-fill-response.dto.js'
import { RdmImportPreviewDto } from './dto/response/rdm-import-preview-response.dto.js'
import { RdmImportResponseDto } from './dto/response/rdm-import-response.dto.js'

const IMPORT_FILE_BODY_SCHEMA = {
  type: 'object',
  required: ['file', 'teachingAssignmentId'],
  properties: {
    file: { type: 'string', format: 'binary' },
    teachingAssignmentId: { type: 'string', format: 'uuid' },
  },
}

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
    private readonly downloadRdmWorkbook: DownloadRdmWorkbookUseCase,
    private readonly importRdmWorkbook: ImportRdmWorkbookUseCase,
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

  @Get('workbook')
  @RequirePermissions('assessment-items.rdm')
  @ApiOperation({
    summary: 'Download an offline Excel workbook in RDM layout',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns an RDM-layout Excel workbook',
    headers: {
      'Content-Disposition': {
        description:
          'Attachment filename with ASCII fallback and UTF-8 encoding',
        schema: { type: 'string' },
      },
      'X-Rdm-Items-Not-Included': {
        description: 'Count of eligible items omitted past the sheet limit',
        schema: { type: 'string' },
      },
    },
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async workbook(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DownloadRdmWorkbookQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const result = await this.downloadRdmWorkbook.execute({
      userId: user.id,
      teachingAssignmentId: query.teachingAssignmentId,
      kind: query.kind,
    })
    res.set({
      'Content-Type': RDM_XLSX_MIME,
      'Content-Disposition': contentDisposition('attachment', result.fileName),
      ...(result.itemsNotIncluded > 0 && {
        'X-Rdm-Items-Not-Included': String(result.itemsNotIncluded),
      }),
    })
    return new StreamableFile(result.buffer)
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

  @Post('import/preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('assessment-items.rdm')
  @UseInterceptors(FileInterceptor('file', { limits: RDM_UPLOAD_LIMITS }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Preview importing an RDM-layout Excel workbook without writing',
  })
  @ApiBody({ schema: IMPORT_FILE_BODY_SCHEMA })
  @ApiResponse({ status: 200, type: RdmImportPreviewDto })
  async importPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportRdmWorkbookDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<RdmImportPreviewDto> {
    assertValidXlsxUpload(file)
    return RdmImportPreviewDto.fromDomain(
      await this.importRdmWorkbook.preview({
        userId: user.id,
        teachingAssignmentId: dto.teachingAssignmentId,
        file: file.buffer,
      }),
    )
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('assessment-items.rdm')
  @UseInterceptors(FileInterceptor('file', { limits: RDM_UPLOAD_LIMITS }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import an RDM-layout Excel workbook in one transaction',
  })
  @ApiBody({ schema: IMPORT_FILE_BODY_SCHEMA })
  @ApiResponse({ status: 200, type: RdmImportResponseDto })
  async importConfirm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportRdmWorkbookDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<RdmImportResponseDto> {
    assertValidXlsxUpload(file)
    return RdmImportResponseDto.fromDomain(
      await this.importRdmWorkbook.confirm({
        userId: user.id,
        teachingAssignmentId: dto.teachingAssignmentId,
        file: file.buffer,
      }),
    )
  }
}
