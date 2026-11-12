import { computed, ref } from 'vue'
import { examEventService } from '../services/examEventService'
import type {
  CandidateStudent,
  SeatedStudent,
} from '../services/examEventService'
import type { ExamRoom, SeatAssignPayload } from '../types'

export function useSeatAssignment(
  rooms: () => ExamRoom[],
  semesterId: () => string,
) {
  const seats = ref<SeatedStudent[]>([])
  const candidates = ref<CandidateStudent[]>([])
  const roomId = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const saving = ref(false)

  const seatedIds = computed(
    () => new Set(seats.value.map((seat) => seat.studentId)),
  )

  const available = computed(() =>
    candidates.value.filter((row) => !seatedIds.value.has(row.studentId)),
  )

  const nextSeatNumber = computed(
    () =>
      seats.value.reduce((max, seat) => Math.max(max, seat.seatNumber), 0) + 1,
  )

  async function load(nextRoomId = roomId.value) {
    roomId.value = nextRoomId
    if (!nextRoomId) {
      seats.value = []
      candidates.value = []
      return
    }
    loading.value = true
    const [seated, people] = await Promise.all([
      examEventService.loadSeats(nextRoomId, semesterId()),
      examEventService.loadCandidates(semesterId()),
    ])
    loading.value = false
    if (seated.success) {
      seats.value = seated.data
      error.value = null
    } else {
      seats.value = []
      error.value = seated.error
    }
    candidates.value = people
  }

  async function assign(students: SeatAssignPayload[]): Promise<boolean> {
    if (students.length === 0 || saving.value) return false
    saving.value = true
    const result = await examEventService.assignSeats(roomId.value, students)
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return false
    }
    await load()
    return true
  }

  async function distribute(
    roomIds: string[],
    interleaveByClassroom: boolean,
  ): Promise<boolean> {
    if (roomIds.length === 0 || saving.value) return false
    saving.value = true
    const result = await examEventService.distributeSeats(
      roomId.value || roomIds[0] || '',
      candidates.value.map((row) => ({
        studentId: row.studentId,
        classroomId: row.classroomId,
      })),
      roomIds,
      interleaveByClassroom,
    )
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return false
    }
    if (roomId.value !== '') await load()
    return true
  }

  const roomName = computed(
    () => rooms().find((room) => room.id === roomId.value)?.name ?? '',
  )

  return {
    seats,
    candidates,
    available,
    roomId,
    roomName,
    loading,
    error,
    saving,
    nextSeatNumber,
    load,
    assign,
    distribute,
  }
}
