import { formatScore, type GradingItem } from '@/features/exam-grading/types'
import type { GradingSheetStudent } from './gradingSheet'

export interface ScoreTypeColumn {
  type: GradingItem['type']
  label: string
  maxPoints: number
}

export const SCORE_RECAP_TYPES: readonly {
  type: GradingItem['type']
  label: string
}[] = [
  { type: 'MULTIPLE_CHOICE', label: 'PG' },
  { type: 'MULTIPLE_RESPONSE', label: 'PG Kompleks' },
  { type: 'TRUE_FALSE', label: 'Benar/Salah' },
  { type: 'SHORT_ANSWER', label: 'Isian' },
  { type: 'ESSAY', label: 'Uraian' },
]

export function activeScoreColumns(
  students: GradingSheetStudent[],
): ScoreTypeColumn[] {
  const columns: ScoreTypeColumn[] = []
  for (const spec of SCORE_RECAP_TYPES) {
    let maxPoints = 0
    let used = false
    for (const student of students) {
      const matching = student.items.filter((item) => item.type === spec.type)
      if (matching.length === 0) continue
      used = true
      const sum = matching.reduce((total, item) => total + item.points, 0)
      if (sum > maxPoints) maxPoints = sum
    }
    if (used) {
      columns.push({ type: spec.type, label: spec.label, maxPoints })
    }
  }
  return columns
}

export function scoreOfType(
  student: GradingSheetStudent,
  type: GradingItem['type'],
): number | null {
  const matching = student.items.filter((item) => item.type === type)
  if (matching.length === 0) return null
  if (!matching.some((item) => item.score !== null)) return null
  return matching.reduce((sum, item) => sum + (item.score ?? 0), 0)
}

export function studentTotalScore(student: GradingSheetStudent): {
  raw: number | null
  max: number
} {
  const itemMax = student.items.reduce((sum, item) => sum + item.points, 0)
  const max = student.maxScore ?? itemMax
  if (student.rawScore !== undefined) {
    return { raw: student.rawScore, max }
  }
  const scored = student.items.some((item) => item.score !== null)
  if (!scored) return { raw: null, max }
  const raw = student.items.reduce((sum, item) => sum + (item.score ?? 0), 0)
  return { raw, max }
}

export function formatTotalScore(student: GradingSheetStudent): string {
  const { raw, max } = studentTotalScore(student)
  return `${raw === null ? '-' : formatScore(raw)} / ${formatScore(max)}`
}
