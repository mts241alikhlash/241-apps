import { randomUUID } from 'node:crypto'
import type {
  AttendanceFile,
  AttendanceKind,
  NewAttendanceFile,
} from '../domain/entities/attendance-file.entity.js'
import { attendanceScopeKey } from '../domain/policies/attendance-scope.policy.js'
import { IAttendanceFileRepository } from '../domain/repositories/attendance-file.repository.js'

export class FakeAttendanceFileRepository extends IAttendanceFileRepository {
  readonly rows = new Map<string, AttendanceFile>()
  failUpsert = false

  upsert(input: NewAttendanceFile) {
    if (this.failUpsert) return Promise.reject(new Error('db down'))
    const key = attendanceScopeKey(input)
    const previous = this.rows.get(key) ?? null
    const file = { ...input, id: previous?.id ?? randomUUID() }
    this.rows.set(key, file)
    return Promise.resolve({ file, previous })
  }

  list(eventId: string, filter: { kind?: AttendanceKind; day?: string }) {
    return Promise.resolve(
      [...this.rows.values()].filter(
        (row) =>
          row.eventId === eventId &&
          (filter.kind === undefined || row.kind === filter.kind) &&
          (filter.day === undefined || row.day === filter.day),
      ),
    )
  }

  findById(eventId: string, fileId: string) {
    return Promise.resolve(
      [...this.rows.values()].find(
        (row) => row.id === fileId && row.eventId === eventId,
      ) ?? null,
    )
  }
}
