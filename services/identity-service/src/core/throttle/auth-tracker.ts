import { createHash } from 'node:crypto'

interface TrackedRequest {
  ip?: string
  body?: unknown
}

const SUBJECT_FIELDS = ['identifier', 'email'] as const
const SECRET_FIELDS = ['refreshToken', 'code'] as const

function readField(body: unknown, field: string): string | null {
  if (typeof body !== 'object' || body === null) return null
  const value: unknown = Reflect.get(body, field)
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function subjectOf(body: unknown): string | null {
  for (const field of SUBJECT_FIELDS) {
    const value = readField(body, field)
    if (value !== null) return value.trim().toLowerCase()
  }
  for (const field of SECRET_FIELDS) {
    const value = readField(body, field)
    if (value !== null) {
      return createHash('sha256').update(value).digest('hex').slice(0, 32)
    }
  }
  return null
}

export function authTracker(request: TrackedRequest): Promise<string> {
  const address = request.ip ?? 'unknown'
  const subject = subjectOf(request.body)
  return Promise.resolve(subject === null ? address : `${address}|${subject}`)
}
