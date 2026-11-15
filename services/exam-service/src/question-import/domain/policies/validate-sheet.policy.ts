import type { ParsedQuestion } from '../parsed-question.js'
import { TEMPLATE_VERSION, type SheetIdentity } from '../import-sheet.js'

const GRADE_LEVELS: Record<string, number> = {
  '7': 7,
  VII: 7,
  '8': 8,
  VIII: 8,
  '9': 9,
  IX: 9,
}

export function parseGradeLevel(raw: string): number | null {
  return GRADE_LEVELS[raw.trim().toUpperCase()] ?? null
}

export function validateIdentity(
  identity: SheetIdentity,
  target: { subjectName: string; gradeLevel: number },
): string[] {
  const messages: string[] = []
  if (identity.version !== TEMPLATE_VERSION) {
    messages.push('Template lama. Unduh template baru.')
  }
  if (identity.nik.trim() === '') {
    messages.push('NIK guru wajib diisi')
  }
  if (identity.gradeLevel === null) {
    messages.push('Tingkat kelas wajib diisi')
  }
  const subjectMatches =
    identity.subjectName.trim().toLowerCase() ===
    target.subjectName.trim().toLowerCase()
  const gradeMatches = identity.gradeLevel === target.gradeLevel
  if (!subjectMatches || (identity.gradeLevel !== null && !gradeMatches)) {
    messages.push(
      `File untuk ${identity.subjectName.trim()} tingkat ${identity.gradeLevel}, paket tujuan ${target.subjectName} tingkat ${target.gradeLevel}`,
    )
  }
  return messages
}

function normaliseText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function duplicateRows(
  existingBodyHtml: string[],
  questions: ParsedQuestion[],
): number[] {
  const existing = new Set(existingBodyHtml.map(normaliseText))
  return questions
    .filter((question) => existing.has(normaliseText(question.bodyHtml)))
    .map((question) => question.row)
}
