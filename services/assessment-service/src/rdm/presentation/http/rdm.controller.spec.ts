import {
  BadRequestException,
  StreamableFile,
  ValidationPipe,
  type ExecutionContext,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { JwtAuthGuard } from '@mts241alikhlash/nest-core/auth'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import type { AuthenticatedUser } from '@mts241alikhlash/nest-core/types'
import type { Response } from 'express'
import request from 'supertest'
import type { App } from 'supertest/types.js'
import { DownloadRdmWorkbookUseCase } from '../../application/use-cases/download-rdm-workbook.use-case.js'
import { FillRdmTemplateUseCase } from '../../application/use-cases/fill-rdm-template.use-case.js'
import { GetRdmCandidatesUseCase } from '../../application/use-cases/get-rdm-candidates.use-case.js'
import { ImportRdmWorkbookUseCase } from '../../application/use-cases/import-rdm-workbook.use-case.js'
import { FillRdmTemplateDto } from './dto/request/fill-rdm-template.dto.js'
import { RdmCandidatesResponseDto } from './dto/response/rdm-candidates-response.dto.js'
import { RdmFillResponseDto } from './dto/response/rdm-fill-response.dto.js'
import { RdmImportPreviewDto } from './dto/response/rdm-import-preview-response.dto.js'
import { RdmImportResponseDto } from './dto/response/rdm-import-response.dto.js'
import { RdmController } from './rdm.controller.js'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const user: AuthenticatedUser = {
  id: 'user-1',
  sub: 'user-1',
  identifier: 'guru-1',
  sessionId: 'session-1',
  roles: ['TEACHER'],
}

function makeFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'template.xlsx',
    encoding: '7bit',
    mimetype: XLSX_MIME,
    size: 128,
    buffer: Buffer.from('stub'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
    ...overrides,
  }
}

describe('RdmController', () => {
  let controller: RdmController

  const mockCandidatesUseCase = {
    execute: vi.fn(),
  }

  const mockFillUseCase = {
    execute: vi.fn(),
  }

  const mockDownloadUseCase = {
    execute: vi.fn(),
  }

  const mockImportUseCase = {
    preview: vi.fn(),
    confirm: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RdmController],
      providers: [
        { provide: GetRdmCandidatesUseCase, useValue: mockCandidatesUseCase },
        { provide: FillRdmTemplateUseCase, useValue: mockFillUseCase },
        { provide: DownloadRdmWorkbookUseCase, useValue: mockDownloadUseCase },
        { provide: ImportRdmWorkbookUseCase, useValue: mockImportUseCase },
      ],
    }).compile()

    controller = module.get(RdmController)
    vi.clearAllMocks()
  })

  it('delegates candidates to GetRdmCandidatesUseCase and maps response DTO', async () => {
    mockCandidatesUseCase.execute.mockResolvedValue({
      sumatif: [
        {
          id: 'item-1',
          name: 'UH 1',
          type: AssessmentType.DAILY,
          maxScore: 100,
          material: null,
          kktp: null,
        },
      ],
      sas: [],
    })

    const result = await controller.candidates(user, {
      teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
    })

    expect(mockCandidatesUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
    })
    expect(result).toBeInstanceOf(RdmCandidatesResponseDto)
    expect(result.sumatif).toHaveLength(1)
  })

  it('streams downloaded workbook with Content-Disposition fallback/UTF-8 and optional X-Rdm-Items-Not-Included', async () => {
    mockDownloadUseCase.execute.mockResolvedValue({
      buffer: Buffer.from('xlsx-bytes'),
      fileName: 'Nilai Sumatif-IX.A-Qur’an.xlsx',
      itemsNotIncluded: 3,
    })
    const set = vi.fn()
    const res = { set } as unknown as Response

    const result = await controller.workbook(
      user,
      {
        teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
        kind: 'sumatif',
      },
      res,
    )

    expect(result).toBeInstanceOf(StreamableFile)
    expect(mockDownloadUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
      kind: 'sumatif',
    })
    expect(set).toHaveBeenCalledWith({
      'Content-Type': XLSX_MIME,
      'Content-Disposition':
        'attachment; filename="Nilai Sumatif-IX.A-Qur_an.xlsx"; filename*=UTF-8\'\'Nilai%20Sumatif-IX.A-Qur%E2%80%99an.xlsx',
      'X-Rdm-Items-Not-Included': '3',
    })

    set.mockClear()
    mockDownloadUseCase.execute.mockResolvedValue({
      buffer: Buffer.from('xlsx-bytes'),
      fileName: 'Nilai SAS-IX.A-Informatika.xlsx',
      itemsNotIncluded: 0,
    })

    await controller.workbook(
      user,
      {
        teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
        kind: 'sas',
      },
      res,
    )

    expect(set).toHaveBeenCalledWith({
      'Content-Type': XLSX_MIME,
      'Content-Disposition':
        'attachment; filename="Nilai SAS-IX.A-Informatika.xlsx"; filename*=UTF-8\'\'Nilai%20SAS-IX.A-Informatika.xlsx',
    })
  })

  it('delegates fill with xlsx file and maps RdmFillResponseDto', async () => {
    mockFillUseCase.execute.mockResolvedValue({
      fileName: 'template - terisi.xlsx',
      fileBase64: 'AAAA',
      summary: {
        kind: 'sumatif',
        classSubjectWarning: null,
        sheets: [
          {
            sheetName: 'SUM 1',
            itemId: 'item-1',
            itemName: 'UH 1',
            written: 2,
          },
        ],
        unmatchedRows: [],
        ambiguousRows: [],
        missingStudents: [],
        itemsNotSent: [],
      },
    })

    const file = makeFile()
    const result = await controller.fill(
      user,
      {
        teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
        itemIds: ['22222222-2222-4222-8222-222222222222'],
      },
      file,
    )

    expect(mockFillUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
      file: file.buffer,
      originalFileName: 'template.xlsx',
      itemIds: ['22222222-2222-4222-8222-222222222222'],
    })
    expect(result).toBeInstanceOf(RdmFillResponseDto)
    expect(result.fileName).toBe('template - terisi.xlsx')
  })

  it('delegates import/preview and import to ImportRdmWorkbookUseCase', async () => {
    mockImportUseCase.preview.mockResolvedValue({
      sheets: [
        {
          sheetName: 'SUM 1',
          name: 'UH 1',
          action: 'create',
          itemId: null,
          scoresToWrite: 2,
          unchanged: 0,
        },
      ],
      unmatchedRows: [],
      invalidValues: [],
    })
    mockImportUseCase.confirm.mockResolvedValue({
      itemsCreated: 1,
      itemsUpdated: 0,
      scoresWritten: 2,
    })

    const file = makeFile()
    const taId = '11111111-1111-4111-8111-111111111111'

    const preview = await controller.importPreview(
      user,
      { teachingAssignmentId: taId },
      file,
    )
    expect(preview).toBeInstanceOf(RdmImportPreviewDto)
    expect(mockImportUseCase.preview).toHaveBeenCalledWith({
      userId: 'user-1',
      teachingAssignmentId: taId,
      file: file.buffer,
    })

    const confirmed = await controller.importConfirm(
      user,
      { teachingAssignmentId: taId },
      file,
    )
    expect(confirmed).toBeInstanceOf(RdmImportResponseDto)
    expect(mockImportUseCase.confirm).toHaveBeenCalledWith({
      userId: 'user-1',
      teachingAssignmentId: taId,
      file: file.buffer,
    })
  })

  it('accepts application/octet-stream when extension is .xlsx', async () => {
    mockFillUseCase.execute.mockResolvedValue({
      fileName: 'template - terisi.xlsx',
      fileBase64: 'AAAA',
      summary: {
        kind: 'sumatif',
        classSubjectWarning: null,
        sheets: [],
        unmatchedRows: [],
        ambiguousRows: [],
        missingStudents: [],
        itemsNotSent: [],
      },
    })

    await expect(
      controller.fill(
        user,
        { teachingAssignmentId: '11111111-1111-4111-8111-111111111111' },
        makeFile({ mimetype: 'application/octet-stream' }),
      ),
    ).resolves.toBeInstanceOf(RdmFillResponseDto)
  })

  it('rejects missing file or non-xlsx files on fill and import', async () => {
    const dto = { teachingAssignmentId: '11111111-1111-4111-8111-111111111111' }

    await expect(controller.fill(user, dto, undefined)).rejects.toThrow(
      BadRequestException,
    )
    await expect(
      controller.fill(user, dto, makeFile({ originalname: 'template.csv' })),
    ).rejects.toThrow(BadRequestException)
    await expect(
      controller.fill(user, dto, makeFile({ mimetype: 'text/csv' })),
    ).rejects.toThrow(BadRequestException)

    await expect(
      controller.importPreview(user, dto, undefined),
    ).rejects.toThrow(BadRequestException)
    await expect(
      controller.importConfirm(user, dto, makeFile({ mimetype: 'text/csv' })),
    ).rejects.toThrow(BadRequestException)
  })

  it('validates FillRdmTemplateDto with single string, array, or omitted itemIds', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })

    const single = (await pipe.transform(
      {
        teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
        itemIds: '22222222-2222-4222-8222-222222222222',
      },
      { type: 'body', metatype: FillRdmTemplateDto },
    )) as FillRdmTemplateDto
    expect(single.itemIds).toEqual(['22222222-2222-4222-8222-222222222222'])

    const repeated = (await pipe.transform(
      {
        teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
        itemIds: [
          '22222222-2222-4222-8222-222222222222',
          '33333333-3333-4333-8333-333333333333',
        ],
      },
      { type: 'body', metatype: FillRdmTemplateDto },
    )) as FillRdmTemplateDto
    expect(repeated.itemIds).toHaveLength(2)

    await expect(
      pipe.transform(
        {
          teachingAssignmentId: '11111111-1111-4111-8111-111111111111',
          itemIds: 'not-a-uuid',
        },
        { type: 'body', metatype: FillRdmTemplateDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('parses multipart itemIds and itemIds[] and enforces 2 MB limit over HTTP', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RdmController],
      providers: [
        { provide: GetRdmCandidatesUseCase, useValue: mockCandidatesUseCase },
        { provide: FillRdmTemplateUseCase, useValue: mockFillUseCase },
        { provide: DownloadRdmWorkbookUseCase, useValue: mockDownloadUseCase },
        { provide: ImportRdmWorkbookUseCase, useValue: mockImportUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context
            .switchToHttp()
            .getRequest<{ user: AuthenticatedUser }>().user = user
          return true
        },
      })
      .compile()

    const app = moduleRef.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    await app.init()

    mockFillUseCase.execute.mockResolvedValue({
      fileName: 'template - terisi.xlsx',
      fileBase64: 'AAAA',
      summary: {
        kind: 'sumatif',
        classSubjectWarning: null,
        sheets: [],
        unmatchedRows: [],
        ambiguousRows: [],
        missingStudents: [],
        itemsNotSent: [],
      },
    })

    const server = app.getHttpServer() as App
    const taId = '11111111-1111-4111-8111-111111111111'
    const id1 = '22222222-2222-4222-8222-222222222222'
    const id2 = '33333333-3333-4333-8333-333333333333'

    await request(server)
      .post('/assessment-items/rdm/fill')
      .field('teachingAssignmentId', taId)
      .field('itemIds[]', id1)
      .field('itemIds[]', id2)
      .attach('file', Buffer.from('xlsx-bytes'), {
        filename: 'template.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(200)

    expect(mockFillUseCase.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ itemIds: [id1, id2] }),
    )

    await request(server)
      .post('/assessment-items/rdm/fill')
      .field('teachingAssignmentId', taId)
      .field('itemIds', id1)
      .attach('file', Buffer.from('xlsx-bytes'), {
        filename: 'template.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(200)

    expect(mockFillUseCase.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ itemIds: [id1] }),
    )

    await request(server)
      .post('/assessment-items/rdm/fill')
      .field('teachingAssignmentId', taId)
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1), {
        filename: 'too-big.xlsx',
        contentType: XLSX_MIME,
      })
      .expect(413)

    await app.close()
  })
})
