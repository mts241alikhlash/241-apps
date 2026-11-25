import { BadRequestException } from '@nestjs/common'

export type RdmKind = 'sumatif' | 'sas'

export interface RosterStudent {
  enrollmentId: string
  nis?: string | null
  nisn?: string | null
  name: string
}

export interface StudentMatchRow {
  row: number
  nis: string
  nisn: string
}

export interface StudentMatchResult {
  matched: Map<number, string>
  unmatchedRows: number[]
  ambiguousRows: number[]
  missing: RosterStudent[]
}

const SUMATIF_SHEET_NAME = /^SUM (?:[1-9]|1[0-5])$/

export function toRdmValue(score: number, maxScore: number): number {
  if (maxScore <= 0 || !Number.isFinite(score) || !Number.isFinite(maxScore)) {
    return 0
  }
  const scaled = Number(((score / maxScore) * 100).toFixed(6))
  const rounded = Math.floor(scaled + 0.5)
  return Math.min(100, Math.max(0, rounded))
}

export function fromRdmValue(value: number, maxScore: number): number {
  if (maxScore <= 0 || !Number.isFinite(value) || !Number.isFinite(maxScore)) {
    return 0
  }
  return Number(((value / 100) * maxScore).toFixed(6))
}

export function isRdmNoOp(
  stored: number | null,
  value: number,
  maxScore: number,
): boolean {
  return stored !== null && toRdmValue(stored, maxScore) === value
}

export function detectRdmKind(sheetNames: string[]): RdmKind {
  if (sheetNames.length === 1 && sheetNames[0] === 'SAS 1') {
    return 'sas'
  }
  if (
    sheetNames.length > 0 &&
    new Set(sheetNames).size === sheetNames.length &&
    sheetNames.every((name) => SUMATIF_SHEET_NAME.test(name))
  ) {
    return 'sumatif'
  }
  throw new BadRequestException('File ini bukan template RDM')
}

export function normalizeStudentId(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) return ''
    return BigInt(raw).toString()
  }
  if (typeof raw === 'bigint') {
    return raw >= 0n ? raw.toString() : ''
  }
  if (typeof raw === 'string') {
    return raw.trim()
  }
  return ''
}

function indexRoster(
  roster: RosterStudent[],
  pickKey: (student: RosterStudent) => string | null | undefined,
): Map<string, RosterStudent[]> {
  const index = new Map<string, RosterStudent[]>()
  for (const student of roster) {
    const key = normalizeStudentId(pickKey(student))
    if (!key) continue
    const bucket = index.get(key)
    if (bucket) {
      bucket.push(student)
    } else {
      index.set(key, [student])
    }
  }
  return index
}

type KeyLookup =
  | { status: 'matched'; enrollmentId: string }
  | { status: 'ambiguous' }
  | { status: 'absent' }

function lookupStudent(
  index: Map<string, RosterStudent[]>,
  rawKey: string,
): KeyLookup {
  const key = normalizeStudentId(rawKey)
  if (!key) return { status: 'absent' }
  const matches = index.get(key)
  if (!matches || matches.length === 0) return { status: 'absent' }
  if (matches.length > 1) return { status: 'ambiguous' }
  const [match] = matches
  return match
    ? { status: 'matched', enrollmentId: match.enrollmentId }
    : { status: 'absent' }
}

function resolveRow(byNis: KeyLookup, byNisn: KeyLookup): KeyLookup {
  if (byNis.status === 'ambiguous' || byNisn.status === 'ambiguous') {
    return { status: 'ambiguous' }
  }
  if (byNis.status === 'matched' && byNisn.status === 'matched') {
    return byNis.enrollmentId === byNisn.enrollmentId
      ? byNis
      : { status: 'ambiguous' }
  }
  if (byNis.status === 'matched') return byNis
  return byNisn
}

export function matchStudents(
  rows: StudentMatchRow[],
  roster: RosterStudent[],
): StudentMatchResult {
  const byNis = indexRoster(roster, (student) => student.nis)
  const byNisn = indexRoster(roster, (student) => student.nisn)

  const matched = new Map<number, string>()
  const unmatchedRows: number[] = []
  const ambiguous = new Set<number>()
  const firstRowByEnrollment = new Map<string, number>()

  for (const entry of rows) {
    const resolved = resolveRow(
      lookupStudent(byNis, entry.nis),
      lookupStudent(byNisn, entry.nisn),
    )
    if (resolved.status === 'absent') {
      unmatchedRows.push(entry.row)
      continue
    }
    if (resolved.status === 'ambiguous') {
      ambiguous.add(entry.row)
      continue
    }
    const firstRow = firstRowByEnrollment.get(resolved.enrollmentId)
    if (firstRow === undefined) {
      firstRowByEnrollment.set(resolved.enrollmentId, entry.row)
      matched.set(entry.row, resolved.enrollmentId)
      continue
    }
    matched.delete(firstRow)
    ambiguous.add(firstRow)
    ambiguous.add(entry.row)
  }

  const ambiguousRows = [...ambiguous].sort((a, b) => a - b)
  const matchedEnrollmentIds = new Set(matched.values())
  const missing = roster.filter(
    (student) => !matchedEnrollmentIds.has(student.enrollmentId),
  )

  return { matched, unmatchedRows, ambiguousRows, missing }
}

export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
