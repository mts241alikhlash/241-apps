import { Injectable } from '@nestjs/common'
import { IAssessmentItemRepository } from '../../../assessment/domain/repositories/assessment-item.repository.js'
import { IGradingScopeReadPort } from '../../../assessment/domain/repositories/grading-scope-read.port.js'
import { IStudentScoreRepository } from '../../../assessment/domain/repositories/student-score.repository.js'
import { IAcademicLookupPort } from '../../../platform/academic-lookup/academic-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../platform/employee-identity/employee-identity.port.js'
import { IEnrollmentLookupPort } from '../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import { RDM_MAX_SUMATIF_SHEETS } from '../../constants/rdm.constants.js'
import { toRdmValue, type RdmKind } from '../../domain/rdm-rules.js'
import { IRdmSettingRepository } from '../../domain/rdm-setting.js'
import {
  buildRdmWorkbook,
  type RdmWorkbookSheetInput,
} from '../../infrastructure/rdm-workbook.builder.js'
import { assertTeaches } from '../assert-teaches.js'
import {
  loadRoster,
  loadScoresByItem,
  resolveAssignmentMeta,
} from '../rdm-assignment.helper.js'
import type {
  DownloadRdmWorkbookInput,
  DownloadRdmWorkbookResult,
} from '../rdm.types.js'

function sanitizeFileSegment(value: string): string {
  return [...value]
    .map((ch) =>
      ch.charCodeAt(0) < 0x20 || '/\\:*?"<>|'.includes(ch) ? '-' : ch,
    )
    .join('')
    .trim()
}

function buildWorkbookFileName(
  kind: RdmKind,
  classroomCode: string,
  subjectName: string,
): string {
  const prefix = kind === 'sas' ? 'Nilai SAS' : 'Nilai Sumatif'
  const safeClassroom = sanitizeFileSegment(classroomCode)
  const safeSubject = sanitizeFileSegment(subjectName)
  return `${prefix}-${safeClassroom}-${safeSubject}.xlsx`
}

@Injectable()
export class DownloadRdmWorkbookUseCase {
  constructor(
    private readonly rdmSettingRepository: IRdmSettingRepository,
    private readonly assessmentItemRepository: IAssessmentItemRepository,
    private readonly studentScoreRepository: IStudentScoreRepository,
    private readonly employeeIdentity: IEmployeeIdentityReadPort,
    private readonly gradingScope: IGradingScopeReadPort,
    private readonly enrollmentLookup: IEnrollmentLookupPort,
    private readonly academicLookup: IAcademicLookupPort,
  ) {}

  async execute(
    input: DownloadRdmWorkbookInput,
  ): Promise<DownloadRdmWorkbookResult> {
    await assertTeaches(input.userId, input.teachingAssignmentId, {
      employeeIdentity: this.employeeIdentity,
      gradingScope: this.gradingScope,
    })

    const [setting, allItems] = await Promise.all([
      this.rdmSettingRepository.get(),
      this.assessmentItemRepository.findAllByTeachingAssignment(
        input.teachingAssignmentId,
      ),
    ])

    const sumatifSet = new Set<string>(setting.sumatifTypes)
    const sasType = `${setting.sasType}`
    const eligibleItems = allItems
      .filter((item) =>
        input.kind === 'sumatif'
          ? sumatifSet.has(item.type)
          : item.type === sasType,
      )
      .sort((a, b) => a.name.localeCompare(b.name))

    const maxSheets = input.kind === 'sas' ? 1 : RDM_MAX_SUMATIF_SHEETS
    const includedItems = eligibleItems.slice(0, maxSheets)
    const itemsNotIncluded = Math.max(0, eligibleItems.length - maxSheets)

    const meta = await resolveAssignmentMeta(
      this.academicLookup,
      input.teachingAssignmentId,
      allItems,
    )

    const roster = (
      await loadRoster(this.enrollmentLookup, meta.classroomId, meta.semesterId)
    ).sort((a, b) => a.name.localeCompare(b.name))

    const scoreMap = await loadScoresByItem(
      this.studentScoreRepository,
      includedItems.map((item) => item.id),
      roster.map((student) => student.enrollmentId),
    )

    const sheets: RdmWorkbookSheetInput[] = includedItems.map((item) => {
      const itemScores = scoreMap.get(item.id)
      const sheetScores = new Map<number, number>()
      for (const [studentIndex, student] of roster.entries()) {
        const rawScore = itemScores?.get(student.enrollmentId) ?? null
        if (rawScore === null) continue
        sheetScores.set(studentIndex, toRdmValue(rawScore, item.maxScore))
      }
      return {
        name: item.name,
        material: item.material,
        kktp: item.kktp,
        scores: sheetScores,
      }
    })

    const buffer = await buildRdmWorkbook({
      kind: input.kind,
      classSubject: `${meta.classroomCode}/${meta.subjectName}`,
      students: roster.map((student) => ({
        nis: student.nis ?? null,
        nisn: student.nisn ?? null,
        name: student.name,
      })),
      sheets,
    })

    return {
      buffer,
      fileName: buildWorkbookFileName(
        input.kind,
        meta.classroomCode,
        meta.subjectName,
      ),
      itemsNotIncluded,
    }
  }
}
