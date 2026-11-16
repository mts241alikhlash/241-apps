import { BadRequestException, StreamableFile } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import type { Response } from 'express'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import {
  FakeExamFileRepository,
  FakeExamFileStorage,
} from '../../../exam-file/application/exam-file.fakes.fake.js'
import { UploadExamFileUseCase } from '../../../exam-file/application/use-cases/upload-exam-file/upload-exam-file.use-case.js'
import {
  FakeQuestionRepository,
  MATH_7,
  TEACHER,
  buildTeacherScope,
} from '../../../question/application/question.repository.fake.js'
import { GetImportTemplateUseCase } from '../../application/use-cases/get-import-template/get-import-template.use-case.js'
import { ImportQuestionsUseCase } from '../../application/use-cases/import-questions/import-questions.use-case.js'
import { FakeExamPackageRepository } from '../../../exam-package/application/exam-package.repository.fake.js'
import { STANDARD_COUNTS } from '../../domain/import-standard.js'
import { ImportTemplateQueryDto } from './dto/import-questions.dto.js'
import { QuestionImportController } from './question-import.controller.js'

const PACKAGE_ID = '33333333-3333-4333-8333-333333333333'

function build() {
  const questions = new FakeQuestionRepository()
  const packages = new FakeExamPackageRepository(questions)
  const now = new Date()
  packages.packages.set(PACKAGE_ID, {
    id: PACKAGE_ID,
    title: 'UTS Matematika',
    ...MATH_7,
    status: 'DRAFT',
    lockedAt: null,
    createdById: TEACHER.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    items: [],
  })
  const { scope, employees, academic } = buildTeacherScope({
    employeeId: 'emp-1',
    pairs: [MATH_7],
  })
  const template = new GetImportTemplateUseCase()
  return {
    template,
    controller: new QuestionImportController(
      new ImportQuestionsUseCase(
        scope,
        packages,
        employees,
        new UploadExamFileUseCase(
          new FakeExamFileRepository(),
          new FakeExamFileStorage(),
        ),
        academic,
        { findEmployeeIdByNik: () => Promise.resolve(null) },
        questions,
      ),
      template,
    ),
  }
}

describe('QuestionImportController', () => {
  it('serves the template as an attachment', async () => {
    const { controller } = build()
    const set = vi.fn()

    const streamed = await controller.template({ format: 'xlsx' }, {
      set,
    } as unknown as Response)

    expect(streamed).toBeInstanceOf(StreamableFile)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Disposition': 'attachment; filename="template-soal.xlsx"',
      }),
    )
  })

  it('refuses a request with no file', async () => {
    await expect(
      build().controller.import(TEACHER, undefined, { packageId: PACKAGE_ID }),
    ).rejects.toThrow(BadRequestException)
  })

  it('guards the preview with exam-questions.create', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        QuestionImportController.prototype.preview,
      ),
    ).toEqual(['exam-questions.create'])
  })

  it('rejects the unmodified template when its subject and grade match no package', async () => {
    const { controller, template } = build()
    const { buffer } = await template.execute('xlsx')

    await expect(
      controller.preview(
        TEACHER,
        {
          buffer,
          size: buffer.length,
          originalname: 'template-soal.xlsx',
        } as Express.Multer.File,
        { packageId: PACKAGE_ID },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('refuses a preview with no file', async () => {
    await expect(
      build().controller.preview(TEACHER, undefined, { packageId: PACKAGE_ID }),
    ).rejects.toThrow(new BadRequestException('Berkas wajib dilampirkan'))
  })

  it('passes the layout and chosen counts to the template use case', async () => {
    const { controller, template } = build()
    const execute = vi.spyOn(template, 'execute')

    await controller.template(
      {
        format: 'docx',
        layout: 'vertical',
        pg: 3,
        pgKompleks: 2,
        benarSalah: 1,
        isian: 0,
        uraian: 4,
      },
      { set: vi.fn() } as unknown as Response,
    )

    expect(execute).toHaveBeenCalledWith('docx', {
      layout: 'vertical',
      counts: {
        MULTIPLE_CHOICE: 3,
        MULTIPLE_RESPONSE: 2,
        TRUE_FALSE: 1,
        SHORT_ANSWER: 0,
        ESSAY: 4,
      },
    })
  })

  it('falls back to the standard counts when none are given', async () => {
    const { controller, template } = build()
    const execute = vi.spyOn(template, 'execute')

    await controller.template({ format: 'docx', layout: 'vertical' }, {
      set: vi.fn(),
    } as unknown as Response)

    expect(execute).toHaveBeenCalledWith('docx', {
      layout: 'vertical',
      counts: {
        MULTIPLE_CHOICE: STANDARD_COUNTS.MULTIPLE_CHOICE,
        MULTIPLE_RESPONSE: STANDARD_COUNTS.MULTIPLE_RESPONSE,
        TRUE_FALSE: STANDARD_COUNTS.TRUE_FALSE,
        SHORT_ANSWER: STANDARD_COUNTS.SHORT_ANSWER,
        ESSAY: STANDARD_COUNTS.ESSAY,
      },
    })
  })

  it('rejects a template count above 100', async () => {
    const errors = await validate(
      plainToInstance(ImportTemplateQueryDto, { format: 'docx', pg: '101' }),
    )

    expect(errors.map((error) => error.property)).toEqual(['pg'])
  })
})
