import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CurrentUser } from '@mts241alikhlash/nest-core/decorators'
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@mts241alikhlash/nest-core/access-control'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { AttendanceFileService } from '../../application/attendance-file.service.js'
import { attendanceFileName } from '../../domain/policies/attendance-scope.policy.js'
import {
  extensionOf,
  REPORT_FILE_MAX_BYTES,
} from '../../domain/policies/report-file.policy.js'
import {
  AttendanceFileDto,
  AttendanceListQueryDto,
  AttendanceUploadBodyDto,
} from './dto/attendance-file.dto.js'

const FILE_LIMITS = { fileSize: REPORT_FILE_MAX_BYTES + 1, files: 1 }

@ApiTags('Exam Attendance Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam-events/:id/attendance-files')
export class ExamAttendanceFileController {
  constructor(private readonly files: AttendanceFileService) {}

  @Put()
  @RequirePermissions('exam-events.manage')
  @UseInterceptors(FileInterceptor('file', { limits: FILE_LIMITS }))
  @ApiOperation({
    summary:
      'Upload or replace a signed attendance sheet scan (PDF, JPG or PNG, 10 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AttendanceUploadBodyDto })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: AttendanceFileDto })
  async upload(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AttendanceUploadBodyDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<AttendanceFileDto> {
    return AttendanceFileDto.fromDomain(
      await this.files.upload(id, user.id, {
        kind: body.kind,
        day: body.day,
        roomId: body.roomId,
        slotId: body.slotId,
        file: file && { buffer: file.buffer, originalName: file.originalname },
      }),
    )
  }

  @Get()
  @RequireAnyPermission('exam-events.manage', 'exam-events.read')
  @ApiOperation({ summary: 'The uploaded attendance sheets of an event' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AttendanceFileDto] })
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: AttendanceListQueryDto,
  ): Promise<AttendanceFileDto[]> {
    return (await this.files.list(id, query)).map((file) =>
      AttendanceFileDto.fromDomain(file),
    )
  }

  @Get(':fileId')
  @RequireAnyPermission('exam-events.manage', 'exam-events.read')
  @ApiOperation({ summary: 'Download an uploaded attendance sheet' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'fileId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'The file bytes, always as an attachment',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, file, roomCode } = await this.files.open(id, fileId)
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'Content-Disposition': `attachment; filename="${attendanceFileName(
        file.kind,
        roomCode,
        file.uploadedAt,
        extensionOf(file.mimeType),
      )}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    })
    return new StreamableFile(stream)
  }
}
