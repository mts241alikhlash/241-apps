import { BadRequestException, Injectable } from '@nestjs/common'
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
  RDM_COMPONENT_NAME_MAX_LENGTH,
  RDM_MAX_SUMATIF_SHEETS,
} from '../../constants/rdm.constants.js'
import {
  detectRdmKind,
  matchStudents,
  toRdmValue,
  type RdmKind,
} from '../../domain/rdm-rules.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import {
  patchRdmTemplate,
  readRdmTemplateRows,
  type RdmSheetPatch,
} from '../../infrastructure/rdm-template-patcher.js'
import { assertTeaches } from '../assert-teaches.js'
import {
  buildSasCountError,
  loadRoster,
  loadScoresByItem,
  resolveAssignmentMeta,
  type AssignmentMeta,
} from '../rdm-assignment.helper.js'
import type {
  FillRdmTemplateInput,
  FillRdmTemplateResult,
  RdmFillSheetSummary,
} from '../rdm.types.js'

function selectItems(
  kind: RdmKind,
  sasType: string,
  allItems: AssessmentItemWithDetails[],
  eligibleItems: AssessmentItemWithDetails[],
  requestedIds?: string[],
): AssessmentItemWithDetails[] {
  let selected: AssessmentItemWithDetails[]
  if (requestedIds && requestedIds.length > 0) {
    const uniqueIds = [...new Set(requestedIds)]
    const allById = new Map(allItems.map((item) => [item.id, item]))
    const eligibleById = new Map(eligibleItems.map((item) => [item.id, item]))
    const invalidIds = uniqueIds.filter((id) => !eligibleById.has(id))
    if (invalidIds.length > 0) {
      const labels = invalidIds.map((id) => allById.get(id)?.name ?? id)
      throw new BadRequestException(
        `Penilaian tidak dapat dikirim ke template ini: ${labels.join(', ')}`,
      )
    }
    selected = uniqueIds.map((id) => eligibleById.get(id)!)
  } else {
    selected = [...eligibleItems]
  }

  selected.sort((a, b) => a.name.localeCompare(b.name))

  if (kind === 'sas') {
    if (selected.length !== 1) {
      throw buildSasCountError(sasType, selected)
    }
  } else if (selected.length > RDM_MAX_SUMATIF_SHEETS) {
    throw new BadRequestException(
      `Maksimal ${RDM_MAX_SUMATIF_SHEETS} penilaian per file RDM`,
    )
  }

  assertUniqueSelectionNames(selected)
  assertRdmNameLengths(selected)
  return selected
}

function assertRdmNameLengths(items: AssessmentItemWithDetails[]): void {
  const tooLong = items
    .map((item) => item.name.trim())
    .filter((name) => name.length > RDM_COMPONENT_NAME_MAX_LENGTH)
  if (tooLong.length > 0) {
    throw new BadRequestException(
      `Nama penilaian untuk RDM maksimal ${RDM_COMPONENT_NAME_MAX_LENGTH} karakter: ${tooLong.join(', ')}`,
    )
  }
}

function assertUniqueSelectionNames(items: AssessmentItemWithDetails[]): void {
  const byKey = new Map<string, AssessmentItemWithDetails[]>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    const list = byKey.get(key)
    if (list) list.push(item)
    else byKey.set(key, [item])
  }
  const duplicates: string[] = []
  for (const group of byKey.values()) {
    if (group.length < 2) continue
    for (const item of group) {
      const trimmed = item.name.trim()
      if (!duplicates.includes(trimmed)) duplicates.push(trimmed)
    }
  }
  if (duplicates.length > 0) {
    throw new BadRequestException(
      `Nama penilaian ganda: ${duplicates.join(', ')}`,
    )
  }
}

function buildClassSubjectWarning(
  e2: string | null,
  meta: AssignmentMeta,
): string | null {
  const actual = e2?.trim() ?? ''
  const classroomCode = meta.classroomCode.trim()
  const classroomName = meta.classroomName?.trim() ?? ''
  const subjectName = meta.subjectName.trim()

  const expectedByCode = `${classroomCode}/${subjectName}`
  const expectedByName = classroomName
    ? `${classroomName}/${subjectName}`
    : null

  const normalizedActual = actual.toLowerCase()
  if (
    normalizedActual === expectedByCode.toLowerCase() ||
    (expectedByName !== null &&
      normalizedActual === expectedByName.toLowerCase())
  ) {
    return null
  }

  const expectedLabel = classroomCode ? expectedByCode : (expectedByName ?? '')
  return `Kelas/mapel di file (${actual || '-'}) berbeda dengan kelas dan mapel yang dipilih (${expectedLabel})`
}

function buildOutputFileName(originalFileName: string): string {
  const baseName = originalFileName.replace(/\.xlsx$/i, '')
  return `${baseName} - terisi.xlsx`
}

@Injectable()
export class FillRdmTemplateUseCase {
  constructor(
    private readonly rdmSettingRepository: IRdmSettingRepository,
    private readonly assessmentItemRepository: IAssessmentItemRepository,
    private readonly studentScoreRepository: IStudentScoreRepository,
    private readonly employeeIdentity: IEmployeeIdentityReadPort,
    private readonly gradingScope: IGradingScopeReadPort,
    private readonly enrollmentLookup: IEnrollmentLookupPort,
    private readonly academicLookup: IAcademicLookupPort,
  ) {}

  async execute(input: FillRdmTemplateInput): Promise<FillRdmTemplateResult> {
    await assertTeaches(input.userId, input.teachingAssignmentId, {
      employeeIdentity: this.employeeIdentity,
      gradingScope: this.gradingScope,
    })

    const template = await readRdmTemplateRows(input.file)
    const kind = detectRdmKind(template.sheetNames)

    const [setting, allItems] = await Promise.all([
      this.rdmSettingRepository.get(),
      this.assessmentItemRepository.findAllByTeachingAssignment(
        input.teachingAssignmentId,
      ),
    ])

    const sumatifSet = new Set<string>(setting.sumatifTypes)
    const sasType = `${setting.sasType}`
    const eligibleItems = allItems.filter((item) =>
      kind === 'sumatif' ? sumatifSet.has(item.type) : item.type === sasType,
    )

    const selectedItems = selectItems(
      kind,
      setting.sasType,
      allItems,
      eligibleItems,
      input.itemIds,
    )

    const selectedIds = new Set(selectedItems.map((item) => item.id))
    const itemsNotSent = eligibleItems
      .filter((item) => !selectedIds.has(item.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({ id: item.id, name: item.name }))

    const meta = await resolveAssignmentMeta(
      this.academicLookup,
      input.teachingAssignmentId,
      allItems,
    )
    const classSubjectWarning = buildClassSubjectWarning(template.e2, meta)

    const roster = await loadRoster(
      this.enrollmentLookup,
      meta.classroomId,
      meta.semesterId,
    )

    const matchResult = matchStudents(template.rows, roster)
    const matchedEnrollmentIds = [...new Set(matchResult.matched.values())]
    const scoreMap = await loadScoresByItem(
      this.studentScoreRepository,
      selectedItems.map((item) => item.id),
      matchedEnrollmentIds,
    )

    const patches: RdmSheetPatch[] = []
    const sheets: RdmFillSheetSummary[] = []

    for (const [index, item] of selectedItems.entries()) {
      const sheetName = kind === 'sas' ? 'SAS 1' : `SUM ${index + 1}`
      const itemScores = scoreMap.get(item.id)
      const sheetScores = new Map<number, number>()

      for (const [rowNumber, enrollmentId] of matchResult.matched.entries()) {
        const rawScore = itemScores?.get(enrollmentId) ?? null
        if (rawScore === null) continue
        sheetScores.set(rowNumber, toRdmValue(rawScore, item.maxScore))
      }

      patches.push({
        sheetName,
        name: item.name,
        material: item.material,
        kktp: item.kktp,
        scores: sheetScores,
      })
      sheets.push({
        sheetName,
        itemId: item.id,
        itemName: item.name,
        written: sheetScores.size,
      })
    }

    const patchedBuffer = await patchRdmTemplate(input.file, patches)

    return {
      fileName: buildOutputFileName(input.originalFileName),
      fileBase64: patchedBuffer.toString('base64'),
      summary: {
        kind,
        classSubjectWarning,
        sheets,
        unmatchedRows: matchResult.unmatchedRows,
        ambiguousRows: matchResult.ambiguousRows,
        missingStudents: matchResult.missing.map((student) => student.name),
        itemsNotSent,
      },
    }
  }
}
