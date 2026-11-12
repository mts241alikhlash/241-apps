import { computed, ref, watch } from 'vue'
import { examScheduleService } from '../services/examScheduleService'
import type { ExamSchedule, ExamType } from '../types'
import { fromInstant, toInstant } from '../utils/instant'
import { validateSchedule } from '../utils/validateSchedule'

export type ScheduleFormOptions =
  { mode: 'create' } | { mode: 'edit'; schedule: ExamSchedule }

export function useScheduleForm(options: ScheduleFormOptions) {
  const start =
    options.mode === 'edit' ? fromInstant(options.schedule.startsAt) : null
  const end =
    options.mode === 'edit' ? fromInstant(options.schedule.endsAt) : null

  const typeLocked =
    options.mode === 'edit' &&
    (options.schedule.hasSessions || options.schedule.kind === 'MAKEUP')

  const packageId = ref('')
  const type = ref<ExamType | ''>(
    options.mode === 'edit' ? options.schedule.type : '',
  )
  const classroomId = ref('')
  const eventId = ref(
    options.mode === 'edit' ? (options.schedule.eventId ?? '') : '',
  )
  const startDate = ref(start?.date ?? '')
  const endDate = ref(end?.date ?? '')
  const startTime = ref(start?.time ?? '')
  const endTime = ref(end?.time ?? '')
  const durationMinutes = ref<number | null>(
    options.mode === 'edit' ? options.schedule.durationMinutes : 90,
  )
  const saving = ref(false)
  const error = ref<string | null>(null)

  watch(
    packageId,
    () => {
      classroomId.value = ''
    },
    { flush: 'sync' },
  )

  const problem = computed<string | null>(() => {
    if (options.mode === 'create') {
      if (!packageId.value) return 'Pilih paket'
      if (!classroomId.value) return 'Pilih kelas'
      if (!type.value) return 'Pilih jenis ujian'
    }
    return validateSchedule({
      startDate: startDate.value,
      startTime: startTime.value,
      endDate: endDate.value,
      endTime: endTime.value,
      durationMinutes: durationMinutes.value,
    })
  })

  function window() {
    const base = {
      type: (typeLocked && options.mode === 'edit'
        ? options.schedule.type
        : type.value) as ExamType,
      startsAt: toInstant(startDate.value, startTime.value),
      endsAt: toInstant(endDate.value, endTime.value),
      durationMinutes: durationMinutes.value ?? 0,
    }
    if (options.mode === 'create' && eventId.value === '') return base
    return { ...base, eventId: eventId.value || null }
  }

  async function submit(): Promise<ExamSchedule | null> {
    if (problem.value !== null || saving.value) return null
    saving.value = true
    error.value = null
    const result =
      options.mode === 'create'
        ? await examScheduleService.saveSchedule(
            { mode: 'create' },
            {
              packageId: packageId.value,
              classroomId: classroomId.value,
              ...window(),
            },
          )
        : await examScheduleService.saveSchedule(
            { mode: 'edit', id: options.schedule.id },
            window(),
          )
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return null
    }
    return result.data
  }

  return {
    packageId,
    classroomId,
    eventId,
    type,
    typeLocked,
    startDate,
    startTime,
    endDate,
    endTime,
    durationMinutes,
    get multiDay() {
      return startDate.value !== endDate.value
    },
    saving,
    error,
    problem,
    submit,
  }
}
