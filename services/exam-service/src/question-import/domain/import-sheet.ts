import type { ImportRowIssue, ParsedQuestion } from './parsed-question.js'

export const TEMPLATE_VERSION = 2

export interface SheetIdentity {
  version: number | null
  teacherName: string
  nik: string
  subjectName: string
  gradeLevel: number | null
}

export interface ImportSheet {
  identity: SheetIdentity
  questions: ParsedQuestion[]
  errors: ImportRowIssue[]
  warnings: string[]
}
