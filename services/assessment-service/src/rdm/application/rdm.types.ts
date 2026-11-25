import type { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import type { RdmKind } from '../domain/rdm-rules.js'

export interface GetRdmCandidatesInput {
  userId: string
  teachingAssignmentId: string
}

export interface RdmCandidateItem {
  id: string
  name: string
  type: `${AssessmentType}`
  maxScore: number
  material: string | null
  kktp: number | null
}

export interface GetRdmCandidatesResult {
  sumatif: RdmCandidateItem[]
  sas: RdmCandidateItem[]
}

export interface FillRdmTemplateInput {
  userId: string
  teachingAssignmentId: string
  file: Buffer
  originalFileName: string
  itemIds?: string[]
}

export interface RdmFillSheetSummary {
  sheetName: string
  itemId: string
  itemName: string
  written: number
}

export interface RdmItemRef {
  id: string
  name: string
}

export interface RdmFillSummary {
  kind: RdmKind
  classSubjectWarning: string | null
  sheets: RdmFillSheetSummary[]
  unmatchedRows: number[]
  ambiguousRows: number[]
  missingStudents: string[]
  itemsNotSent: RdmItemRef[]
}

export interface FillRdmTemplateResult {
  fileName: string
  fileBase64: string
  summary: RdmFillSummary
}

export interface DownloadRdmWorkbookInput {
  userId: string
  teachingAssignmentId: string
  kind: RdmKind
}

export interface DownloadRdmWorkbookResult {
  buffer: Buffer
  fileName: string
  itemsNotIncluded: number
}

export interface ImportRdmWorkbookInput {
  userId: string
  teachingAssignmentId: string
  file: Buffer
}

export interface RdmImportSheetPreview {
  sheetName: string
  name: string
  action: 'create' | 'update'
  itemId: string | null
  scoresToWrite: number
  unchanged: number
}

export interface RdmImportRowIssue {
  sheetName: string
  row: number
}

export interface RdmImportPreviewResult {
  sheets: RdmImportSheetPreview[]
  unmatchedRows: RdmImportRowIssue[]
  invalidValues: RdmImportRowIssue[]
}
