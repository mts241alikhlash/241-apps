export const PRESET_NAMES = ['UJIAN_KETAT', 'ULANGAN_KELAS', 'TUGAS'] as const

export type PresetName = (typeof PRESET_NAMES)[number]

export const ACTIVITY_TOKEN_MODES = ['ROTATING', 'STATIC'] as const

export type ActivityTokenMode = (typeof ACTIVITY_TOKEN_MODES)[number]

export const EXAM_TYPES = ['UH', 'QUIZ', 'ASSIGNMENT', 'UTS', 'UAS'] as const

export interface GradeOption {
  id: string
  label: string
}

export interface ClassroomOption {
  id: string
  gradeId: string
  label: string
}

export interface PackageOption {
  id: string
  subjectId: string
  label: string
}

export interface ActivityCreatePayload {
  semesterId: string
  eventId?: string
  gradeId: string
  subjectId: string
  packageId: string
  type: (typeof EXAM_TYPES)[number]
  classroomIds: string[]
  presetName: PresetName
  tokenMode: ActivityTokenMode
  startsAt: string
  endsAt: string
  durationMinutes: number
}

export interface ExamActivityRecord {
  id: string
  gradeId: string
  status: string
  tokenMode: ActivityTokenMode
  tokenRotation: number
  durationMinutes: number
  policy: Record<string, number>
}

export const PRESET_LABELS: Record<PresetName, string> = {
  UJIAN_KETAT: 'Ujian ketat (UTS/UAS)',
  ULANGAN_KELAS: 'Ulangan di kelas',
  TUGAS: 'Tugas / PR',
}
