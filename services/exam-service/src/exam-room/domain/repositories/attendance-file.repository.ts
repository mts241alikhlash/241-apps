import type {
  AttendanceFile,
  AttendanceKind,
  NewAttendanceFile,
} from '../entities/attendance-file.entity.js'

export abstract class IAttendanceFileRepository {
  abstract upsert(
    input: NewAttendanceFile,
  ): Promise<{ file: AttendanceFile; previous: AttendanceFile | null }>
  abstract list(
    eventId: string,
    filter: { kind?: AttendanceKind; day?: string },
  ): Promise<AttendanceFile[]>
  abstract findById(
    eventId: string,
    fileId: string,
  ): Promise<AttendanceFile | null>
}
