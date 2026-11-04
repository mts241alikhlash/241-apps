import { computed, ref } from 'vue'
import { examScheduleService } from '../services/examScheduleService'
import type {
  Absentee,
  ExamSchedule,
  MakeupOrigin,
  MakeupReason,
} from '../types'
import { toInstant } from '../utils/instant'
import { validateSchedule } from '../utils/validateSchedule'

export function useMakeupForm(original: MakeupOrigin) {
  const absentees = ref<Absentee[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const selected = ref<Set<string>>(new Set())
  const reason = ref<MakeupReason>('SICK')
  const overrides = ref<Record<string, MakeupReason>>({})
  const notes = ref<Record<string, string>>({})
  const packageId = ref(original.packageId)
  const date = ref('')
  const startTime = ref('')
  const endTime = ref('')
  const durationMinutes = ref<number | null>(original.durationMinutes)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    loadError.value = null
    const result = await examScheduleService.loadAbsentees(original.id)
    loading.value = false
    if (result.success) {
      absentees.value = result.data
      const reported = result.data.filter(
        (row) => row.eligible && row.reportedReason != null,
      )
      if (reported.length > 0) {
        const first = reported[0].reportedReason ?? 'SICK'
        reason.value = first
        overrides.value = Object.fromEntries(
          reported.map((row) => [row.studentId, row.reportedReason ?? first]),
        )
        notes.value = Object.fromEntries(
          reported
            .filter((row) => (row.reportedNote ?? '') !== '')
            .map((row) => [row.studentId, row.reportedNote ?? '']),
        )
      }
    } else {
      absentees.value = []
      loadError.value = result.error
    }
  }

  const eligible = (studentId: string) =>
    absentees.value.some((row) => row.studentId === studentId && row.eligible)

  function toggle(studentId: string) {
    if (!eligible(studentId)) return
    const next = new Set(selected.value)
    if (next.has(studentId)) {
      next.delete(studentId)
      const { [studentId]: _reason, ...keptReasons } = overrides.value
      const { [studentId]: _note, ...keptNotes } = notes.value
      overrides.value = keptReasons
      notes.value = keptNotes
    } else {
      next.add(studentId)
    }
    selected.value = next
  }

  const reasonOf = (studentId: string): MakeupReason =>
    overrides.value[studentId] ?? reason.value

  function setReason(studentId: string, value: MakeupReason) {
    overrides.value = { ...overrides.value, [studentId]: value }
  }

  function setNote(studentId: string, value: string) {
    notes.value = { ...notes.value, [studentId]: value }
  }

  function selectAll() {
    selected.value = new Set(
      absentees.value.filter((row) => row.eligible).map((row) => row.studentId),
    )
  }

  function clear() {
    selected.value = new Set()
    overrides.value = {}
    notes.value = {}
  }

  const problem = computed<string | null>(() => {
    if (selected.value.size === 0) return 'Pilih minimal satu siswa'
    const invalid = validateSchedule({
      date: date.value,
      startTime: startTime.value,
      endTime: endTime.value,
      durationMinutes: durationMinutes.value,
    })
    if (invalid !== null) return invalid
    if (
      new Date(toInstant(date.value, startTime.value)).getTime() <
      new Date(original.endsAt).getTime()
    ) {
      return 'Susulan harus dimulai setelah ujian utama berakhir'
    }
    return null
  })

  async function submit(): Promise<ExamSchedule | null> {
    if (problem.value !== null || saving.value) return null
    saving.value = true
    error.value = null
    const result = await examScheduleService.createMakeup(original.id, {
      packageId: packageId.value,
      startsAt: toInstant(date.value, startTime.value),
      endsAt: toInstant(date.value, endTime.value),
      durationMinutes: durationMinutes.value ?? 0,
      participants: [...selected.value].map((studentId) => {
        const note = (notes.value[studentId] ?? '').trim()
        return {
          studentId,
          reason: reasonOf(studentId),
          ...(note === '' ? {} : { note }),
        }
      }),
    })
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return null
    }
    return result.data
  }

  return {
    absentees,
    loading,
    loadError,
    selected,
    reason,
    notes,
    reasonOf,
    setReason,
    setNote,
    packageId,
    date,
    startTime,
    endTime,
    durationMinutes,
    saving,
    error,
    problem,
    load,
    toggle,
    selectAll,
    clear,
    submit,
  }
}
