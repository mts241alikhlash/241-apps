import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePromotionTable } from './usePromotionTable'
import type {
  PromotionRecommendationItem,
  PromotionStudentDecision,
} from '../types'

const student = (
  id: string,
  classroom: string,
): PromotionRecommendationItem => ({
  studentId: id,
  studentName: `Siswa ${id}`,
  nis: id,
  sourceClassroomId: `${classroom}-id`,
  sourceClassroomName: classroom,
  sourceLevel: 'VII',
  recommendedAction: 'PROMOTE',
  targetClassroomId: 'viii-a-id',
  targetClassroomName: 'VIII-A',
  targetLevel: 'VIII',
})

function setup() {
  const recommendations = ref<PromotionRecommendationItem[]>([
    student('a1', 'VII-A'),
    student('a2', 'VII-A'),
    student('b1', 'VII-B'),
  ])

  let emitted: PromotionStudentDecision[] = []
  const table = usePromotionTable(recommendations, (decisions) => {
    emitted = decisions
  })

  return {
    recommendations,
    table,
    decisionFor: (id: string) => emitted.find((d) => d.studentId === id),
  }
}

describe('usePromotionTable, a tick belongs to the class it was made in', () => {
  it('drops the selection when the class filter changes', async () => {
    const { table } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()
    expect(table.selectedIds.value.size).toBe(2)

    table.filterClass.value = 'VII-B'
    await nextTick()

    expect(table.selectedIds.value.size).toBe(0)
  })

  it('does not decline a student in a class that is not on screen', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()

    table.selectedIds.value.add('b1')

    table.declineReason.value = 'Kehadiran kurang'
    table.confirmBulkDecline()

    expect(decisionFor('a1')?.approved).toBe(false)
    expect(decisionFor('b1')?.approved).toBe(true)
  })

  it('does not move a student in a class that is not on screen', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()
    table.selectedIds.value.add('b1')

    table.setTargetClassroomForSelected('viii-b-id')

    expect(decisionFor('a1')?.targetClassroomId).toBe('viii-b-id')
    expect(decisionFor('b1')?.targetClassroomId).toBe('viii-a-id')
  })

  it('acts on what the search left visible', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()
    table.searchQuery.value = 'a1'
    await nextTick()

    table.declineReason.value = 'Nilai di bawah KKM'
    table.confirmBulkDecline()

    expect(decisionFor('a1')?.approved).toBe(false)
    expect(decisionFor('a2')?.approved).toBe(true)
  })
})

describe('usePromotionTable, declining forgets where the student was going', () => {
  it('clears the target so a grade-up class is never sent for a REPEAT', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    expect(decisionFor('a1')?.targetClassroomId).toBe('viii-a-id')

    table.openDeclineDialog('a1')
    table.declineReason.value = 'Kehadiran kurang'
    table.confirmDecline()

    expect(decisionFor('a1')?.action).toBe('REPEAT')
    expect(decisionFor('a1')?.targetClassroomId).toBeUndefined()
  })

  it('clears it for everyone declined at once', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()

    table.declineReason.value = 'Nilai di bawah KKM'
    table.confirmBulkDecline()

    expect(decisionFor('a1')?.targetClassroomId).toBeUndefined()
    expect(decisionFor('a2')?.targetClassroomId).toBeUndefined()
  })

  it('keeps the selection so the group can be given one', async () => {
    const { table } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.toggleSelectAll()

    table.declineReason.value = 'Nilai di bawah KKM'
    table.confirmBulkDecline()

    expect(table.selectedIds.value.size).toBe(2)
  })

  it('puts a student back where they were going when the decline is undone', async () => {
    const { table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()

    table.openDeclineDialog('a1')
    table.declineReason.value = 'Kehadiran kurang'
    table.confirmDecline()

    table.approveStudent('a1')

    expect(decisionFor('a1')?.approved).toBe(true)
    expect(decisionFor('a1')?.action).toBe('PROMOTE')
    expect(decisionFor('a1')?.targetClassroomId).toBe('viii-a-id')
    expect(decisionFor('a1')?.declineReason).toBeUndefined()
  })
})

describe('usePromotionTable, a refetch is not always a new cohort', () => {
  it('keeps decisions when the same cohort comes back', async () => {
    const { recommendations, table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.openDeclineDialog('a1')
    table.declineReason.value = 'Kehadiran kurang'
    table.confirmDecline()

    recommendations.value = [
      student('a1', 'VII-A'),
      student('a2', 'VII-A'),
      student('b1', 'VII-B'),
    ]
    await nextTick()

    expect(decisionFor('a1')?.approved).toBe(false)
    expect(decisionFor('a1')?.declineReason).toBe('Kehadiran kurang')
  })

  it('keeps the class on screen through that refetch', async () => {
    const { recommendations, table } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()

    recommendations.value = [student('a1', 'VII-A'), student('b1', 'VII-B')]
    await nextTick()

    expect(table.filterClass.value).toBe('VII-A')
    expect(table.filteredRows.value).toHaveLength(1)
  })

  it('starts over when the same student arrives from another year', async () => {
    const { recommendations, table, decisionFor } = setup()

    table.filterClass.value = 'VII-A'
    await nextTick()
    table.openDeclineDialog('a1')
    table.declineReason.value = 'Kehadiran kurang'
    table.confirmDecline()

    const nextYear = student('a1', 'VII-A')
    nextYear.sourceClassroomId = 'vii-a-id-2027'
    recommendations.value = [nextYear]
    await nextTick()

    expect(decisionFor('a1')?.approved).toBe(true)
    expect(decisionFor('a1')?.declineReason).toBeUndefined()
  })

  it('clears the filter when the class is not in the new list', async () => {
    const { recommendations, table } = setup()

    table.filterClass.value = 'VII-B'
    await nextTick()

    recommendations.value = [student('a1', 'VII-A')]
    await nextTick()

    expect(table.filterClass.value).toBe('')
  })
})
