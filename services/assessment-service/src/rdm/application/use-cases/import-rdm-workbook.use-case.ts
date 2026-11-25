import { BadRequestException, Injectable } from '@nestjs/common'
import { ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE } from '../../../assessment/constants/assessment.constants.js'
import {
  IAssessmentItemRepository,
  type AssessmentItemWithDetails,
} from '../../../assessment/domain/repositories/assessment-item.repository.js'
import { IGradingScopeReadPort } from '../../../assessment/domain/repositories/grading-scope-read.port.js'
import { IStudentScoreRepository } from '../../../assessment/domain/repositories/student-score.repository.js'
import { IAcademicLookupPort } from '../../../platform/academic-lookup/academic-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import { IEnrollmentLookupPort } from '../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import {
  RDM_DEFAULT_MAX_SCORE,
  RDM_MAX_MATERIAL_LENGTH,
  RDM_MAX_NAME_LENGTH,
} from '../../constants/rdm.constants.js'
import {
  IRdmImportRepository,
  type RdmImportPlan,
  type RdmImportResult,
  type RdmImportScoreRecord,
} from '../../domain/rdm-import.repository.js'
import {
  fromRdmValue,
  isRdmNoOp,
  matchStudents,
  sameName,
} from '../../domain/rdm-rules.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import {
  readRdmWorkbook,
  type RdmWorkbookSheet,
} from '../../infrastructure/rdm-workbook.reader.js'
import { assertTeaches } from '../assert-teaches.js'
import {
  buildSasCountError,
  loadRoster,
  loadScoresByItem,
  resolveAssignmentMeta,
} from '../rdm-assignment.helper.js'
import type {
  ImportRdmWorkbookInput,
  RdmImportPreviewResult,
  RdmImportRowIssue,
  RdmImportSheetPreview,
} from '../rdm.types.js'

interface ActiveSheet extends RdmWorkbookSheet {
  name: string
}

function assertUniqueSheetNames(sheets: ActiveSheet[]): void {
  const byKey = new Map<string, ActiveSheet[]>()
  for (const sheet of sheets) {
    const key = sheet.name.trim().toLowerCase()
    const group = byKey.get(key)
    if (group) group.push(sheet)
    else byKey.set(key, [sheet])
  }

  for (const group of byKey.values()) {
    if (group.length < 2) continue
    const [first] = group
    if (!first) continue
    const sheetList = group.map((sheet) => sheet.sheetName).join(', ')
    throw new BadRequestException(
      `Nama penilaian ganda di file: ${first.name} (${sheetList})`,
    )
  }
}

function assertSheetFieldLengths(sheets: ActiveSheet[]): void {
  for (const sheet of sheets) {
    if (sheet.name.length > RDM_MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `Nama penilaian pada sheet "${sheet.sheetName}" maksimal ${RDM_MAX_NAME_LENGTH} karakter`,
      )
    }
    if (
      sheet.material !== null &&
      sheet.material.length > RDM_MAX_MATERIAL_LENGTH
    ) {
      throw new BadRequestException(
        `Materi pada sheet "${sheet.sheetName}" maksimal ${RDM_MAX_MATERIAL_LENGTH} karakter`,
      )
    }
  }
}

@Injectable()
export class ImportRdmWorkbookUseCase {
  constructor(
    private readonly rdmSettingRepository: IRdmSettingRepository,
    private readonly assessmentItemRepository: IAssessmentItemRepository,
    private readonly studentScoreRepository: IStudentScoreRepository,
    private readonly rdmImportRepository: IRdmImportRepository,
    private readonly employeeIdentity: IEmployeeIdentityReadPort,
    private readonly gradingScope: IGradingScopeReadPort,
    private readonly enrollmentLookup: IEnrollmentLookupPort,
    private readonly academicLookup: IAcademicLookupPort,
  ) {}

  private async preparePlan(input: ImportRdmWorkbookInput): Promise<{
    preview: RdmImportPreviewResult
    plan: RdmImportPlan
  }> {
    await assertTeaches(input.userId, input.teachingAssignmentId, {
      employeeIdentity: this.employeeIdentity,
      gradingScope: this.gradingScope,
    })

    const workbook = await readRdmWorkbook(input.file)

    const activeSheets = workbook.sheets.filter(
      (sheet): sheet is ActiveSheet =>
        sheet.name !== null &&
        sheet.rows.some((row) => row.score.status !== 'empty'),
    )

    if (activeSheets.length === 0) {
      return {
        preview: { sheets: [], unmatchedRows: [], invalidValues: [] },
        plan: {
          teachingAssignmentId: input.teachingAssignmentId,
          creates: [],
          updates: [],
        },
      }
    }

    assertUniqueSheetNames(activeSheets)
    assertSheetFieldLengths(activeSheets)

    const [setting, allItems] = await Promise.all([
      this.rdmSettingRepository.get(),
      this.assessmentItemRepository.findAllByTeachingAssignment(
        input.teachingAssignmentId,
      ),
    ])

    const sumatifSet = new Set<string>(setting.sumatifTypes)
    const sasType = `${setting.sasType}`
    const createType =
      workbook.kind === 'sas' ? setting.sasType : setting.sumatifTypes[0]
    if (!createType) {
      throw new BadRequestException(
        'Pengaturan RDM belum memiliki jenis penilaian sumatif',
      )
    }

    const sasItems = allItems.filter((item) => item.type === sasType)
    if (workbook.kind === 'sas' && sasItems.length > 1) {
      throw buildSasCountError(setting.sasType, sasItems)
    }
    const sumatifItems = allItems.filter((item) => sumatifSet.has(item.type))

    const matchedBySheet = new Map<string, AssessmentItemWithDetails | null>()
    for (const sheet of activeSheets) {
      if (workbook.kind === 'sas') {
        const sasItem = sasItems[0] ?? null
        if (
          !sasItem &&
          allItems.some((item) => sameName(item.name, sheet.name))
        ) {
          throw new BadRequestException(ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE)
        }
        matchedBySheet.set(sheet.sheetName, sasItem)
        continue
      }

      const matches = sumatifItems.filter((item) =>
        sameName(item.name, sheet.name),
      )
      if (matches.length > 1) {
        throw new BadRequestException(`Nama penilaian ganda: ${sheet.name}`)
      }
      const matched = matches[0] ?? null
      if (
        !matched &&
        allItems.some((item) => sameName(item.name, sheet.name))
      ) {
        throw new BadRequestException(ASSESSMENT_ITEM_NAME_CONFLICT_MESSAGE)
      }
      matchedBySheet.set(sheet.sheetName, matched)
    }

    const meta = await resolveAssignmentMeta(
      this.academicLookup,
      input.teachingAssignmentId,
      allItems,
    )
    const roster = await loadRoster(
      this.enrollmentLookup,
      meta.classroomId,
      meta.semesterId,
    )

    const matchedItemIds = [
      ...new Set(
        [...matchedBySheet.values()]
          .filter((item): item is AssessmentItemWithDetails => item !== null)
          .map((item) => item.id),
      ),
    ]
    const scoreMap = await loadScoresByItem(
      this.studentScoreRepository,
      matchedItemIds,
      roster.map((student) => student.enrollmentId),
    )

    const sheetPreviews: RdmImportSheetPreview[] = []
    const unmatchedRows: RdmImportRowIssue[] = []
    const invalidValues: RdmImportRowIssue[] = []
    const creates: RdmImportPlan['creates'] = []
    const updates: RdmImportPlan['updates'] = []

    for (const sheet of activeSheets) {
      if (sheet.kktp.status === 'invalid') {
        invalidValues.push({ sheetName: sheet.sheetName, row: 5 })
      }

      const matchResult = matchStudents(sheet.rows, roster)
      const nonMatched = [
        ...matchResult.unmatchedRows,
        ...matchResult.ambiguousRows,
      ].sort((a, b) => a - b)
      for (const rowNumber of nonMatched) {
        unmatchedRows.push({ sheetName: sheet.sheetName, row: rowNumber })
      }

      const existing = matchedBySheet.get(sheet.sheetName) ?? null
      const maxScore = existing ? existing.maxScore : RDM_DEFAULT_MAX_SCORE
      const existingScores = existing ? scoreMap.get(existing.id) : undefined

      let hasValidScore = false
      let scoresToWrite = 0
      let unchanged = 0
      const scores: RdmImportScoreRecord[] = []

      for (const row of sheet.rows) {
        if (row.score.status === 'empty') continue
        if (row.score.status === 'invalid') {
          invalidValues.push({ sheetName: sheet.sheetName, row: row.row })
          continue
        }
        hasValidScore = true
        const enrollmentId = matchResult.matched.get(row.row)
        if (!enrollmentId) continue

        const storedScore = existingScores?.get(enrollmentId) ?? null
        if (isRdmNoOp(storedScore, row.score.value, maxScore)) {
          unchanged += 1
          continue
        }

        scoresToWrite += 1
        scores.push({
          enrollmentId,
          score: fromRdmValue(row.score.value, maxScore),
        })
      }

      if (!hasValidScore) continue

      sheetPreviews.push({
        sheetName: sheet.sheetName,
        name: existing ? existing.name : sheet.name,
        action: existing ? 'update' : 'create',
        itemId: existing?.id ?? null,
        scoresToWrite,
        unchanged,
      })

      if (existing) {
        const materialUpdate =
          sheet.material !== null && sheet.material !== existing.material
            ? sheet.material
            : undefined
        const kktpUpdate =
          sheet.kktp.status === 'valid' && sheet.kktp.value !== existing.kktp
            ? sheet.kktp.value
            : undefined

        if (
          materialUpdate !== undefined ||
          kktpUpdate !== undefined ||
          scores.length > 0
        ) {
          updates.push({
            itemId: existing.id,
            ...(materialUpdate !== undefined && { material: materialUpdate }),
            ...(kktpUpdate !== undefined && { kktp: kktpUpdate }),
            scores,
          })
        }
      } else {
        creates.push({
          sheetName: sheet.sheetName,
          name: sheet.name,
          type: createType,
          material: sheet.material,
          kktp: sheet.kktp.status === 'valid' ? sheet.kktp.value : null,
          scores,
        })
      }
    }

    return {
      preview: {
        sheets: sheetPreviews,
        unmatchedRows,
        invalidValues,
      },
      plan: {
        teachingAssignmentId: input.teachingAssignmentId,
        creates,
        updates,
      },
    }
  }

  async preview(
    input: ImportRdmWorkbookInput,
  ): Promise<RdmImportPreviewResult> {
    const { preview } = await this.preparePlan(input)
    return preview
  }

  async confirm(input: ImportRdmWorkbookInput): Promise<RdmImportResult> {
    const { plan } = await this.preparePlan(input)
    return this.rdmImportRepository.apply(plan, null)
  }
}
