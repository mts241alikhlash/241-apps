export interface ScopePair {
  subjectId: string
  subjectName: string | null
  gradeId: string
  gradeLevel: number | null
  gradeName: string | null
}

export interface QuestionScope {
  all: boolean
  employeeId: string | null
  pairs: ScopePair[]
}

export interface NamedOption {
  id: string
  name: string
}

export interface GradeRecord {
  id: string
  level: number
  name: string | null
}

export interface ExamFile {
  id: string
  mimeType: string
  sizeBytes: number
}

export interface ImportRowError {
  row: number
  reason: string
}

export interface ImportResult {
  created: number
  questionIds: string[]
  errors: ImportRowError[]
}

export type TemplateFormat = 'xlsx' | 'docx'
