export class DuplicateRoomCodeError extends Error {
  constructor() {
    super('Kode ruangan sudah dipakai di kegiatan ini')
  }
}

export class SeatAlreadyTakenError extends Error {
  constructor(readonly constraint: 'student' | 'seat') {
    super(
      constraint === 'student'
        ? 'Siswa sudah menempati kursi di kegiatan ini'
        : 'Nomor kursi sudah terpakai di ruangan ini',
    )
  }
}

export class ExamRoomConflictError extends Error {
  constructor(readonly constraint: string) {
    super('Data ruangan ujian bentrok dengan baris yang sudah ada')
  }
}

interface UniqueViolationMeta {
  target?: string | readonly string[]
  driverAdapterError?: {
    cause?: { constraint?: { index?: string; fields?: readonly string[] } }
  }
}

export function uniqueConstraintOf(meta: UniqueViolationMeta): string {
  const fromAdapter = meta.driverAdapterError?.cause?.constraint
  if (fromAdapter?.index !== undefined) return fromAdapter.index
  if (fromAdapter?.fields !== undefined) return fromAdapter.fields.join('_')
  if (Array.isArray(meta.target)) return meta.target.join('_')
  if (typeof meta.target === 'string') return meta.target
  return ''
}

export function uniqueViolationError(constraint: string): Error {
  if (constraint.includes('_code')) return new DuplicateRoomCodeError()
  if (constraint.includes('seat_number')) {
    return new SeatAlreadyTakenError('seat')
  }
  if (constraint.includes('student_id')) {
    return new SeatAlreadyTakenError('student')
  }
  return new ExamRoomConflictError(constraint)
}
