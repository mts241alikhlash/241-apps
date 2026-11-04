import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildReviewColumns } from './reviewPackageColumns'
import type { ExamPackageSummary } from '../types'

const pkg: ExamPackageSummary = {
  id: 'p1',
  title: 'UAS Matematika',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'SUBMITTED',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-29T00:00:00.000Z',
  updatedAt: '2026-10-29T03:30:00.000Z',
  itemCount: 12,
}

function columns(onOpen = vi.fn()) {
  return buildReviewColumns({
    subjectName: (id) => (id === 'math' ? 'Matematika' : '-'),
    gradeName: (id) => (id === 'g7' ? 'Kelas 7' : '-'),
    onOpen,
  })
}

describe('buildReviewColumns', () => {
  it('lists title, subject, grade, question count, update time and one action', () => {
    expect(columns().map((column) => column.id)).toEqual([
      'title',
      'subject',
      'grade',
      'items',
      'updated',
      'actions',
    ])
  })

  it('shows the names and the count', () => {
    const text = (id: string) =>
      (
        columns().find((column) => column.id === id)!.meta as {
          mobileValue: (row: ExamPackageSummary) => string
        }
      ).mobileValue(pkg)

    expect(text('subject')).toBe('Matematika')
    expect(text('grade')).toBe('Kelas 7')
    expect(text('items')).toBe('12 soal')
  })

  it('opens the package from the one action', () => {
    const onOpen = vi.fn()
    const cell = columns(onOpen).find((column) => column.id === 'actions')!
      .cell as (ctx: { row: { original: ExamPackageSummary } }) => VNode

    ;(
      cell({ row: { original: pkg } }).props as { onClick: () => void }
    ).onClick()

    expect(onOpen).toHaveBeenCalledWith(pkg)
  })
})
