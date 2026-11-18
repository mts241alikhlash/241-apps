import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import { PACKAGE_CHANGED_MESSAGE } from '../../../../exam-package/application/use-cases/add-package-question/add-package-question.use-case.js'
import type { ExamPackageDetail } from '../../../../exam-package/domain/entities/exam-package.entity.js'
import {
  assertCanChange,
  assertEditable,
} from '../../../../exam-package/domain/policies/package-lifecycle.policy.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { UploadExamFileUseCase } from '../../../../exam-file/application/use-cases/upload-exam-file/upload-exam-file.use-case.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { INikEmployeePort } from '../../../../platform/nik-employee/nik-employee.port.js'
import { resolveAuthor } from '../../../../question/application/resolve-author.js'
import {
  TeacherScope,
  canManageAll,
  type ScopeUser,
} from '../../../../question/application/teacher-scope.service.js'
import { prepareQuestion } from '../../../../question/domain/policies/prepare-question.policy.js'
import { assertValidPoints } from '../../../../question/domain/policies/validate-points.policy.js'
import {
  IQuestionRepository,
  type NewQuestionInput,
} from '../../../../question/domain/repositories/question.repository.js'
import type { QuestionType } from '../../../../question/domain/value-objects/question-content.js'
import {
  IMPORT_MAX_IMAGE_BYTES,
  IMPORT_MAX_IMAGES,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_QUESTIONS,
} from '../../../domain/import-limits.js'
import type {
  ImportSheet,
  SheetIdentity,
} from '../../../domain/import-sheet.js'
import { countWarnings } from '../../../domain/import-standard.js'
import type { ParsedQuestion } from '../../../domain/parsed-question.js'
import {
  duplicateRows,
  validateIdentity,
} from '../../../domain/policies/validate-sheet.policy.js'
import {
  assertSafeArchive,
  normalizeArchive,
} from '../../parsers/archive-guard.js'
import { parseExcelSheet } from '../../parsers/excel-sheet.parser.js'
import { parseWordSheet } from '../../parsers/word-sheet.parser.js'
import type {
  ImportPreview,
  ImportQuestionsInput,
  ImportQuestionsResult,
} from './import-questions.input.js'

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]

interface Analysis {
  pkg: ExamPackageDetail
  next: ExamPackageDetail['status']
  identity: SheetIdentity
  warnings: string[]
  rows: number
  good: NewQuestionInput[]
  errors: { row: number; reason: string }[]
  duplicates: number[]
}

@Injectable()
export class ImportQuestionsUseCase {
  constructor(
    private readonly scope: TeacherScope,
    private readonly packages: IExamPackageRepository,
    private readonly employees: IEmployeeIdentityReadPort,
    private readonly uploadFile: UploadExamFileUseCase,
    private readonly academic: IAcademicLookupPort,
    private readonly niks: INikEmployeePort,
    private readonly questions: IQuestionRepository,
  ) {}

  async preview(
    user: ScopeUser,
    input: ImportQuestionsInput,
  ): Promise<ImportPreview> {
    const analysis = await this.analyse(user, input, { saveImages: false })
    const counts: Record<QuestionType, number> = {
      MULTIPLE_CHOICE: 0,
      MULTIPLE_RESPONSE: 0,
      TRUE_FALSE: 0,
      SHORT_ANSWER: 0,
      ESSAY: 0,
    }
    let totalPoints = 0
    for (const question of analysis.good) {
      counts[question.type] += 1
      totalPoints += question.points
    }
    return {
      identity: analysis.identity,
      authorName: null,
      counts,
      totalPoints,
      total: analysis.rows,
      errors: analysis.errors,
      warnings: [...analysis.warnings, ...countWarnings(counts)],
      duplicateRows: analysis.duplicates,
      canSave: analysis.errors.length === 0 && analysis.duplicates.length === 0,
    }
  }

  async execute(
    user: ScopeUser,
    input: ImportQuestionsInput & { confirmDuplicates?: boolean },
  ): Promise<ImportQuestionsResult> {
    const analysis = await this.analyse(user, input, { saveImages: true })
    if (analysis.errors.length > 0) {
      const lines = analysis.errors.map(
        (error) => `baris ${error.row}: ${error.reason}`,
      )
      throw new BadRequestException(`Impor dibatalkan: ${lines.join('; ')}`)
    }
    if (analysis.duplicates.length > 0 && input.confirmDuplicates !== true) {
      throw new ConflictException(
        `Soal ganda ditemukan: baris ${analysis.duplicates.join(', ')}`,
      )
    }

    const { pkg, next, good } = analysis
    const updated = await this.packages.addQuestions(
      pkg.id,
      { expected: pkg.status, next },
      good,
    )
    if (updated === null) throw new ConflictException(PACKAGE_CHANGED_MESSAGE)
    const questionIds = updated.items
      .slice(updated.items.length - good.length)
      .map((item) => item.questionId)
    return { created: questionIds.length, questionIds, errors: [] }
  }

  private async analyse(
    user: ScopeUser,
    input: ImportQuestionsInput,
    options: { saveImages: boolean },
  ): Promise<Analysis> {
    if (input.size > IMPORT_MAX_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas maksimal 10 MB')
    }
    const name = input.fileName.toLowerCase()
    const isExcel = name.endsWith('.xlsx')
    if (!isExcel && !name.endsWith('.docx')) {
      throw new BadRequestException('Berkas harus .xlsx atau .docx')
    }
    if (!ZIP_SIGNATURE.every((byte, index) => input.buffer[index] === byte)) {
      throw new BadRequestException('Isi berkas tidak sesuai dengan jenisnya')
    }

    const pkg = await this.packages.findById(input.packageId)
    if (pkg === null) throw new NotFoundException('Paket tidak ditemukan')
    const scope = await this.scope.forUser(user)
    this.scope.assertCovers(scope, pkg.subjectId, pkg.gradeId)
    assertCanChange(pkg.createdById, user.id, canManageAll(user))
    const next = assertEditable(pkg.status)

    const images = this.imageSaver(user, options.saveImages)
    let sheet: ImportSheet
    if (isExcel) {
      sheet = await parseExcelSheet(await normalizeArchive(input.buffer))
    } else {
      await assertSafeArchive(input.buffer)
      sheet = await parseWordSheet(input.buffer, images.save)
    }
    images.assertNoFailure()
    const rows = sheet.questions.length + sheet.errors.length
    if (rows > IMPORT_MAX_QUESTIONS) {
      throw new BadRequestException('Maksimal 500 soal per berkas')
    }

    const errors = [...sheet.errors]
    const [subjects, grades] = await Promise.all([
      this.academic.subjectsByIds([pkg.subjectId]),
      this.academic.gradesByIds([pkg.gradeId]),
    ])
    const subject = subjects[0]
    const grade = grades[0]
    if (subject === undefined || grade === undefined) {
      throw new BadRequestException('Mapel atau tingkat paket tidak ditemukan')
    }
    for (const reason of validateIdentity(sheet.identity, {
      subjectName: subject.name,
      gradeLevel: grade.level,
    })) {
      errors.push({ row: 0, reason })
    }

    let nikEmployeeId: string | null = null
    if (sheet.identity.nik.trim() !== '') {
      nikEmployeeId = await this.niks.findEmployeeIdByNik(
        sheet.identity.nik.trim(),
      )
      if (nikEmployeeId === null) {
        errors.push({ row: 0, reason: 'NIK guru tidak ditemukan' })
      }
    }
    if (nikEmployeeId !== null && !scope.all) {
      const own = await this.employees.findEmployeeIdByUserId(user.id)
      if (own !== nikEmployeeId) {
        throw new ForbiddenException('NIK pada berkas bukan NIK Anda')
      }
    }
    const authorEmployeeId =
      nikEmployeeId === null
        ? ''
        : await resolveAuthor(this.employees, user, scope.all, nikEmployeeId)

    const good: NewQuestionInput[] = []
    const goodRows: ParsedQuestion[] = []
    for (const question of sheet.questions) {
      try {
        assertValidPoints(question.points)
        const { bodyHtml, content } = prepareQuestion(
          question.type,
          question.bodyHtml,
          question.content,
        )
        good.push({
          packageId: pkg.id,
          subjectId: pkg.subjectId,
          gradeId: pkg.gradeId,
          authorEmployeeId,
          type: question.type,
          createdById: user.id,
          bodyHtml,
          content,
          points: question.points,
        })
        goodRows.push(question)
      } catch (error) {
        if (!(error instanceof HttpException)) throw error
        errors.push({ row: question.row, reason: error.message })
      }
    }

    const existing = await this.questions.findPinned(
      pkg.items.map((item) => ({
        questionId: item.questionId,
        number: item.questionVersion,
      })),
    )
    return {
      pkg,
      next,
      identity: sheet.identity,
      warnings: sheet.warnings,
      rows,
      good,
      errors: errors.sort((a, b) => a.row - b.row),
      duplicates: duplicateRows(
        existing.map((question) => question.bodyHtml),
        goodRows,
      ),
    }
  }

  private imageSaver(
    user: ScopeUser,
    upload: boolean,
  ): {
    save: (content: Buffer) => Promise<string>
    assertNoFailure: () => void
  } {
    const stored = new Map<string, Promise<string>>()
    let totalBytes = 0
    let failure: Error | null = null

    const store = (content: Buffer, digest: string): Promise<string> => {
      if (stored.size >= IMPORT_MAX_IMAGES) {
        return Promise.reject(
          new BadRequestException('Maksimal 100 gambar per berkas'),
        )
      }
      totalBytes += content.length
      if (totalBytes > IMPORT_MAX_IMAGE_BYTES) {
        return Promise.reject(
          new BadRequestException('Total ukuran gambar maksimal 20 MB'),
        )
      }
      const pending = upload
        ? this.uploadFile
            .execute({
              buffer: content,
              size: content.length,
              originalName: 'gambar-impor',
              uploadedById: user.id,
            })
            .then((file) => file.id)
        : Promise.resolve(digest)
      stored.set(digest, pending)
      return pending
    }

    return {
      save: (content) => {
        const digest = createHash('sha256').update(content).digest('hex')
        return (stored.get(digest) ?? store(content, digest)).catch(
          (error: unknown) => {
            failure ??=
              error instanceof Error ? error : new Error(String(error))
            throw error
          },
        )
      },
      assertNoFailure: () => {
        if (failure !== null) throw failure
      },
    }
  }
}
