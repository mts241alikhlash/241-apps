import { Injectable, NotFoundException } from '@nestjs/common'
import { ApiUnprocessableException } from '../../../../core/filters/api-exception.js'
import { categoryOf } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import type {
  ExamEvent,
  ExamEventEdit,
  ExamEventStatus,
  NewExamEvent,
} from '../../../domain/entities/exam-event.entity.js'
import type { PaginatedResult } from '@mts241alikhlash/nest-core/domain'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

export interface EventListFilter {
  semesterId?: string
  status?: ExamEventStatus
  page?: number
  limit?: number
  supervisedOnly?: { userId: string; from: Date }
}

@Injectable()
export class ManageExamEventsUseCase {
  constructor(private readonly rooms: IExamRoomRepository) {}

  async create(
    user: { id: string },
    input: Omit<NewExamEvent, 'createdById'>,
  ): Promise<ExamEvent> {
    if (categoryOf(input.type) !== 'EXAM') {
      throw new ApiUnprocessableException(
        'EVENT_TYPE_NOT_EXAM',
        'Periode ujian hanya untuk Penilaian Tengah Semester atau Penilaian Akhir Semester.',
      )
    }
    return this.rooms.createEvent({ ...input, createdById: user.id })
  }

  async list(filter: EventListFilter): Promise<PaginatedResult<ExamEvent>> {
    const { supervisedOnly, ...query } = filter
    if (supervisedOnly === undefined) return this.rooms.listEvents(query)
    const allowed = new Set(
      await this.rooms.listEventIdsSupervisedBy(
        supervisedOnly.userId,
        supervisedOnly.from,
      ),
    )
    const all = await this.rooms.listEvents({ ...query, page: 1, limit: 1000 })
    const rows = all.data.filter((row) => allowed.has(row.id))
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    return {
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    }
  }

  async get(id: string): Promise<ExamEvent> {
    const found = await this.rooms.findEventById(id)
    if (found === null) {
      throw new NotFoundException('Kegiatan ujian tidak ditemukan')
    }
    return found
  }

  async update(id: string, edit: ExamEventEdit): Promise<ExamEvent> {
    if (edit.type !== undefined && categoryOf(edit.type) !== 'EXAM') {
      throw new ApiUnprocessableException(
        'EVENT_TYPE_NOT_EXAM',
        'Periode ujian hanya untuk Penilaian Tengah Semester atau Penilaian Akhir Semester.',
      )
    }
    if (edit.type !== undefined) {
      const current = await this.get(id)
      if (current.type !== edit.type && (await this.rooms.isEventLinked(id))) {
        throw new ApiUnprocessableException(
          'EVENT_TYPE_LINKED',
          'Jenis periode tidak dapat diganti karena sudah ada kegiatan atau jadwal yang terhubung.',
        )
      }
    }
    const updated = await this.rooms.updateEvent(id, edit)
    if (updated === null) {
      throw new NotFoundException('Kegiatan ujian tidak ditemukan')
    }
    return updated
  }
}
