import { computed, ref } from 'vue'
import { examEventService } from '../services/examEventService'
import type { ExamRoom, RoomUpdatePayload, SupervisorSlot } from '../types'

export function useRoomForm(
  eventId: () => string,
  room?: () => ExamRoom | null,
) {
  const code = ref(room?.()?.code ?? '')
  const name = ref(room?.()?.name ?? '')
  const building = ref(room?.()?.building ?? '')
  const capacity = ref<number | null>(room?.()?.capacity ?? 30)
  const technicianUserId = ref(room?.()?.technicianUserId ?? '')
  const saving = ref(false)
  const error = ref<string | null>(null)

  const problem = computed<string | null>(() => {
    if (!code.value.trim()) return 'Kode ruangan wajib diisi'
    if (!name.value.trim()) return 'Nama ruangan wajib diisi'
    const value = capacity.value
    if (value === null || !Number.isInteger(value) || value < 1) {
      return 'Kapasitas minimal 1 kursi'
    }
    return null
  })

  function payload(): RoomUpdatePayload {
    return {
      code: code.value.trim(),
      name: name.value.trim(),
      building: building.value.trim() || null,
      capacity: capacity.value ?? 0,
      technicianUserId: technicianUserId.value || (room?.() ? null : undefined),
    }
  }

  async function submit(): Promise<ExamRoom | null> {
    if (problem.value !== null || saving.value) return null
    saving.value = true
    error.value = null
    const existing = room?.() ?? null
    const result = await examEventService.saveRoom(
      existing
        ? { mode: 'edit', roomId: existing.id }
        : { mode: 'create', eventId: eventId() },
      payload(),
    )
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return null
    }
    return result.data
  }

  return {
    code,
    name,
    building,
    capacity,
    technicianUserId,
    saving,
    error,
    problem,
    submit,
  }
}

export function useSupervisorSlots(roomId: () => string) {
  const slots = ref<SupervisorSlot[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    const result = await examEventService.loadSupervisors(roomId())
    loading.value = false
    if (result.success) {
      slots.value = result.data
      error.value = null
    } else {
      slots.value = []
      error.value = result.error
    }
  }

  async function substitute(
    slotId: string,
    actualUserId: string,
    reason: string,
  ): Promise<boolean> {
    const result = await examEventService.substituteSupervisor(
      roomId(),
      slotId,
      actualUserId,
      reason,
    )
    if (!result.success) {
      error.value = result.error
      return false
    }
    await refresh()
    return true
  }

  return { slots, loading, error, refresh, substitute }
}
