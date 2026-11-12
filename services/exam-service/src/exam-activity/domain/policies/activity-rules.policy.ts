import {
  ApiForbiddenException,
  ApiUnprocessableException,
} from '../../../core/filters/api-exception.js'
import type { ExamType } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../../exam-schedule/domain/policies/exam-category.policy.js'
import type { ActivityTokenMode } from '../entities/exam-activity.entity.js'

export interface ActivityEventRef {
  type: ExamType
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED'
  startsAt: Date
  endsAt: Date
}

export function assertTypeAllowed(input: {
  type: ExamType
  manageAll: boolean
  event: ActivityEventRef | null
  startsAt: Date
  endsAt: Date
}): void {
  if (input.type === 'FINAL' && !input.manageAll) {
    throw new ApiForbiddenException(
      'FINAL_ADMIN_ONLY',
      'Penilaian Akhir Semester hanya dapat dibuat oleh tata usaha atau kurikulum.',
    )
  }

  if (input.type === 'MIDTERM' && !input.manageAll) {
    if (
      input.event === null ||
      input.event.type !== 'MIDTERM' ||
      input.event.status !== 'ACTIVE' ||
      input.startsAt.getTime() < input.event.startsAt.getTime() ||
      input.endsAt.getTime() > input.event.endsAt.getTime()
    ) {
      throw new ApiUnprocessableException(
        'MIDTERM_OUTSIDE_EVENT',
        'Penilaian Tengah Semester oleh guru memerlukan periode PTS yang sedang aktif dan berada di dalam rentang waktunya.',
      )
    }
  }

  if (categoryOf(input.type) === 'EXAM') {
    if (input.event === null || input.event.type !== input.type) {
      throw new ApiUnprocessableException(
        'EVENT_REQUIRED',
        'Kegiatan ujian wajib memilih periode ujian yang sejenis.',
      )
    }
  }
}

export function assertActivityAllowed(input: {
  type: ExamType
  presetName: ExamType
  tokenMode: ActivityTokenMode
  manageAll: boolean
  event: ActivityEventRef | null
  startsAt: Date
  endsAt: Date
}): void {
  assertTypeAllowed(input)

  if (categoryOf(input.type) === 'EXAM') {
    if (input.presetName !== input.type) {
      throw new ApiUnprocessableException(
        'PRESET_LOCKED',
        'Preset kegiatan ujian terkunci ke jenis ujiannya.',
      )
    }
    if (input.tokenMode !== 'ROTATING') {
      throw new ApiUnprocessableException(
        'TOKEN_MODE_LOCKED',
        'Kegiatan ujian wajib memakai token bergilir.',
      )
    }
  } else if (categoryOf(input.presetName) === 'EXAM') {
    throw new ApiUnprocessableException(
      'PRESET_LOCKED',
      'Kegiatan non-ujian hanya dapat memakai preset Penilaian Harian atau Tugas.',
    )
  }
}
