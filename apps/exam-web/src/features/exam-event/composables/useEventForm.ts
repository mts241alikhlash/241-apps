import { computed, ref, watch } from 'vue'
import { examEventService } from '../services/examEventService'
import type {
  EventCreatePayload,
  EventUpdatePayload,
  ExamEvent,
  ExamEventStatus,
} from '../types'
import { fromInstant, toInstant } from '@/features/exam-schedule/utils/instant'
import type { ExamType } from '@/features/exam-schedule/types'

export type EventFormOptions =
  { mode: 'create'; semesterId: string } | { mode: 'edit'; event: ExamEvent }

export function useEventForm(options: EventFormOptions) {
  const start =
    options.mode === 'edit' ? fromInstant(options.event.startsAt) : null
  const end = options.mode === 'edit' ? fromInstant(options.event.endsAt) : null

  const name = ref(options.mode === 'edit' ? options.event.name : '')
  const type = ref<ExamType | ''>(
    options.mode === 'edit' ? options.event.type : '',
  )
  const startDate = ref(start?.date ?? '')
  const startTime = ref(start?.time ?? '08:00')
  const endDate = ref(end?.date ?? '')
  const endTime = ref(end?.time ?? '12:00')
  const lateToleranceMinutes = ref<number | null>(
    options.mode === 'edit' ? options.event.lateToleranceMinutes : 30,
  )
  const minSubmitMinutes = ref<number | null>(
    options.mode === 'edit' ? options.event.minSubmitMinutes : 20,
  )
  const status = ref<ExamEventStatus>(
    options.mode === 'edit' ? options.event.status : 'DRAFT',
  )
  const saving = ref(false)
  const error = ref<string | null>(null)

  watch(startDate, (value) => {
    if (!endDate.value) endDate.value = value
  })

  const problem = computed<string | null>(() => {
    if (!name.value.trim()) return 'Nama kegiatan wajib diisi'
    if (!type.value) return 'Pilih jenis ujian'
    if (!startDate.value || !startTime.value) return 'Waktu mulai wajib diisi'
    if (!endDate.value || !endTime.value) return 'Waktu selesai wajib diisi'
    const startsAt = toInstant(startDate.value, startTime.value)
    const endsAt = toInstant(endDate.value, endTime.value)
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      return 'Waktu selesai harus setelah waktu mulai'
    }
    const late = lateToleranceMinutes.value
    if (late === null || !Number.isInteger(late) || late < 0) {
      return 'Toleransi keterlambatan minimal 0 menit'
    }
    const minSubmit = minSubmitMinutes.value
    if (minSubmit === null || !Number.isInteger(minSubmit) || minSubmit < 0) {
      return 'Batas kumpul minimal 0 menit'
    }
    return null
  })

  function window() {
    return {
      name: name.value.trim(),
      startsAt: toInstant(startDate.value, startTime.value),
      endsAt: toInstant(endDate.value, endTime.value),
      lateToleranceMinutes: lateToleranceMinutes.value ?? 0,
      minSubmitMinutes: minSubmitMinutes.value ?? 0,
    }
  }

  function createPayload(semesterId: string): EventCreatePayload {
    return { semesterId, type: type.value as ExamType, ...window() }
  }

  function updatePayload(): EventUpdatePayload {
    return { ...window(), status: status.value }
  }

  async function submit(): Promise<ExamEvent | null> {
    if (problem.value !== null || saving.value) return null
    saving.value = true
    error.value = null
    const result =
      options.mode === 'create'
        ? await examEventService.saveEvent(
            { mode: 'create' },
            createPayload(options.semesterId),
          )
        : await examEventService.saveEvent(
            { mode: 'edit', id: options.event.id },
            updatePayload(),
          )
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return null
    }
    return result.data
  }

  return {
    name,
    type,
    startDate,
    startTime,
    endDate,
    endTime,
    lateToleranceMinutes,
    minSubmitMinutes,
    status,
    saving,
    error,
    problem,
    submit,
  }
}
