import { computed, ref, watch, type Ref } from 'vue'
import type {
  PromotionRecommendationItem,
  PromotionStudentDecision,
} from '../types'

export function usePromotionTable(
  recommendations: Ref<PromotionRecommendationItem[]>,
  onUpdateDecisions: (decisions: PromotionStudentDecision[]) => void,
) {
  const decisions = ref<Map<string, PromotionStudentDecision>>(new Map())
  const searchQuery = ref('')
  const filterClass = ref('')
  const filterStatus = ref('all')
  const selectedIds = ref<Set<string>>(new Set())
  const showDeclineDialog = ref(false)
  const declineTarget = ref<string | null>(null)
  const declineReason = ref('')

  function emitDecisions() {
    onUpdateDecisions(Array.from(decisions.value.values()))
  }

  watch(
    recommendations,
    (items) => {
      const previous = decisions.value
      const map = new Map<string, PromotionStudentDecision>()

      for (const item of items) {
        const kept = previous.get(item.studentId)
        const sameCohort = kept?.sourceClassroomId === item.sourceClassroomId

        map.set(
          item.studentId,
          sameCohort
            ? kept
            : {
                studentId: item.studentId,
                sourceClassroomId: item.sourceClassroomId,
                targetClassroomId: item.targetClassroomId,
                action: item.recommendedAction,
                approved: true,
                declineReason: undefined,
              },
        )
      }

      decisions.value = map

      const classStillListed = items.some(
        (item) => item.sourceClassroomName === filterClass.value,
      )
      if (!classStillListed) {
        filterClass.value = ''
        selectedIds.value = new Set()
      }

      emitDecisions()
    },
    { immediate: true },
  )

  const uniqueClasses = computed(() => {
    const set = new Set<string>()
    for (const r of recommendations.value) {
      if (r.sourceClassroomName) set.add(r.sourceClassroomName)
    }
    return Array.from(set).sort()
  })

  const filteredRows = computed(() => {
    if (!filterClass.value) return []

    let items = recommendations.value

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      items = items.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.nis.toLowerCase().includes(q),
      )
    }

    if (filterClass.value !== 'all') {
      items = items.filter((r) => r.sourceClassroomName === filterClass.value)
    }

    if (filterStatus.value !== 'all') {
      items = items.filter((r) => {
        const d = decisions.value.get(r.studentId)
        if (filterStatus.value === 'approved') return d?.approved === true
        if (filterStatus.value === 'declined') return d?.approved === false
        return true
      })
    }

    return items
  })

  watch(filterClass, () => {
    selectedIds.value = new Set()
  })

  const selectedVisibleRows = computed(() =>
    filteredRows.value.filter((row) => selectedIds.value.has(row.studentId)),
  )

  const allVisibleSelected = computed(() => {
    if (filteredRows.value.length === 0) return false
    return filteredRows.value.every((r) => selectedIds.value.has(r.studentId))
  })

  const summaryStats = computed(() => {
    let approved = 0
    let declined = 0
    for (const d of decisions.value.values()) {
      if (d.approved) approved++
      else declined++
    }
    return { approved, declined, total: decisions.value.size }
  })

  function toggleSelectAll() {
    if (allVisibleSelected.value) {
      for (const r of filteredRows.value) {
        selectedIds.value.delete(r.studentId)
      }
    } else {
      for (const r of filteredRows.value) {
        selectedIds.value.add(r.studentId)
      }
    }
  }

  function toggleSelect(studentId: string) {
    if (selectedIds.value.has(studentId)) {
      selectedIds.value.delete(studentId)
    } else {
      selectedIds.value.add(studentId)
    }
  }

  function getDecision(
    studentId: string,
  ): PromotionStudentDecision | undefined {
    return decisions.value.get(studentId)
  }

  function approveStudent(studentId: string) {
    const d = decisions.value.get(studentId)
    if (!d) return
    const rec = recommendations.value.find((r) => r.studentId === studentId)
    if (!rec) return

    decisions.value.set(studentId, {
      ...d,
      approved: true,
      action: rec.recommendedAction,
      targetClassroomId: rec.targetClassroomId,
      declineReason: undefined,
    })
    emitDecisions()
  }

  function openDeclineDialog(studentId: string) {
    declineTarget.value = studentId
    declineReason.value = ''
    showDeclineDialog.value = true
  }

  function confirmDecline() {
    if (!declineTarget.value || !declineReason.value.trim()) return

    const d = decisions.value.get(declineTarget.value)
    if (!d) return

    decisions.value.set(declineTarget.value, {
      ...d,
      approved: false,
      action: 'REPEAT',
      targetClassroomId: undefined,
      declineReason: declineReason.value.trim(),
    })

    showDeclineDialog.value = false
    declineTarget.value = null
    declineReason.value = ''
    emitDecisions()
  }

  function setTargetClassroom(studentId: string, classroomId: string) {
    const d = decisions.value.get(studentId)
    if (!d) return

    decisions.value.set(studentId, { ...d, targetClassroomId: classroomId })
    emitDecisions()
  }

  function setTargetClassroomForSelected(classroomId: string) {
    for (const row of selectedVisibleRows.value) {
      const d = decisions.value.get(row.studentId)
      if (!d) continue
      decisions.value.set(row.studentId, {
        ...d,
        targetClassroomId: classroomId,
      })
    }
    emitDecisions()
  }

  function bulkApprove() {
    for (const row of selectedVisibleRows.value) {
      approveStudent(row.studentId)
    }
    selectedIds.value.clear()
  }

  function bulkDecline() {
    if (selectedIds.value.size === 0) return
    declineTarget.value = null
    declineReason.value = ''
    showDeclineDialog.value = true
  }

  function confirmBulkDecline() {
    if (!declineReason.value.trim()) return

    for (const row of selectedVisibleRows.value) {
      const d = decisions.value.get(row.studentId)
      if (!d) continue

      decisions.value.set(row.studentId, {
        ...d,
        approved: false,
        action: 'REPEAT',
        targetClassroomId: undefined,
        declineReason: declineReason.value.trim(),
      })
    }

    showDeclineDialog.value = false
    emitDecisions()
  }

  function handleConfirmDeclineModal() {
    if (declineTarget.value) {
      confirmDecline()
    } else {
      confirmBulkDecline()
    }
  }

  return {
    decisions,
    searchQuery,
    filterClass,
    filterStatus,
    selectedIds,
    selectedVisibleRows,
    showDeclineDialog,
    declineTarget,
    declineReason,
    uniqueClasses,
    filteredRows,
    allVisibleSelected,
    summaryStats,
    toggleSelectAll,
    toggleSelect,
    getDecision,
    approveStudent,
    setTargetClassroom,
    setTargetClassroomForSelected,
    openDeclineDialog,
    confirmDecline,
    bulkApprove,
    bulkDecline,
    confirmBulkDecline,
    handleConfirmDeclineModal,
  }
}
