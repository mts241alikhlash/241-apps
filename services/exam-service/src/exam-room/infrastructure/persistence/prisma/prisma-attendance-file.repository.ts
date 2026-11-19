import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../core/database/prisma.service.js'
import type {
  AttendanceFile,
  AttendanceKind,
  NewAttendanceFile,
} from '../../../domain/entities/attendance-file.entity.js'
import { attendanceScopeKey } from '../../../domain/policies/attendance-scope.policy.js'
import { IAttendanceFileRepository } from '../../../domain/repositories/attendance-file.repository.js'

@Injectable()
export class PrismaAttendanceFileRepository extends IAttendanceFileRepository {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async upsert(input: NewAttendanceFile) {
    const scopeKey = attendanceScopeKey(input)
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.examAttendanceFile.findUnique({
        where: { scopeKey },
      })
      const file = await tx.examAttendanceFile.upsert({
        where: { scopeKey },
        create: { ...input, scopeKey },
        update: {
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          originalName: input.originalName,
          uploadedById: input.uploadedById,
          uploadedAt: input.uploadedAt,
        },
      })
      return { file: toDomain(file), previous: previous && toDomain(previous) }
    })
  }

  async list(eventId: string, filter: { kind?: AttendanceKind; day?: string }) {
    const rows = await this.prisma.examAttendanceFile.findMany({
      where: { eventId, kind: filter.kind, day: filter.day },
      orderBy: [{ day: 'asc' }, { uploadedAt: 'asc' }],
    })
    return rows.map(toDomain)
  }

  async findById(eventId: string, fileId: string) {
    const row = await this.prisma.examAttendanceFile.findFirst({
      where: { id: fileId, eventId },
    })
    return row && toDomain(row)
  }
}

function toDomain(row: {
  id: string
  eventId: string
  kind: AttendanceKind
  roomId: string | null
  slotId: string | null
  day: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  originalName: string
  uploadedById: string
  uploadedAt: Date
}): AttendanceFile {
  return {
    id: row.id,
    eventId: row.eventId,
    kind: row.kind,
    roomId: row.roomId,
    slotId: row.slotId,
    day: row.day,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    originalName: row.originalName,
    uploadedById: row.uploadedById,
    uploadedAt: row.uploadedAt,
  }
}
