import type { AssessmentType } from '@/features/assessment/assessment-item'

export type RdmWorkbookKind = 'sumatif' | 'sas'

export interface RdmCandidateItem {
  id: string
  name: string
  type: AssessmentType
  maxScore: number
  material: string | null
  kktp: number | null
}

export interface RdmCandidatesResponse {
  sumatif: RdmCandidateItem[]
  sas: RdmCandidateItem[]
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
  kind: RdmWorkbookKind
  classSubjectWarning: string | null
  sheets: RdmFillSheetSummary[]
  unmatchedRows: number[]
  ambiguousRows: number[]
  missingStudents: string[]
  itemsNotSent: RdmItemRef[]
}

export interface RdmFillResponse {
  fileName: string
  fileBase64: string
  summary: RdmFillSummary
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

export interface RdmImportPreview {
  classSubjectWarning: string | null
  sheets: RdmImportSheetPreview[]
  unmatchedRows: RdmImportRowIssue[]
  invalidValues: RdmImportRowIssue[]
}

export interface RdmImportResponse {
  itemsCreated: number
  itemsUpdated: number
  scoresWritten: number
}

export interface RdmDownloadResult {
  fileName: string
  itemsNotIncluded: number
}

export interface RdmSetting {
  sumatifTypes: AssessmentType[]
  sasType: AssessmentType
}
