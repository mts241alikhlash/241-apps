import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { buildPackageColumns } from './packageColumns'
import type { ExamPackageSummary } from '../types'

const pkg = (
  overrides: Partial<ExamPackageSummary> = {},
): ExamPackageSummary => ({
  id: 'p1',
  title: 'UTS Matematika',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'DRAFT',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  itemCount: 12,
  ...overrides,
})

function columns(
  overrides: Partial<Parameters<typeof buildPackageColumns>[0]> = {},
) {
  return buildPackageColumns({
    subjectName: (id) => (id === 'math' ? 'Matematika' : '-'),
    gradeName: (id) => (id === 'g7' ? 'Kelas 7' : '-'),
    canDelete: () => true,
    canCopy: true,
    onOpen: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  })
}

function actions(
  options: Partial<Parameters<typeof buildPackageColumns>[0]>,
  row: ExamPackageSummary,
) {
  const column = columns(options).find((item) => item.id === 'actions')!
  const cell = column.cell as (ctx: {
    row: { original: ExamPackageSummary }
  }) => VNode
  return cell({ row: { original: row } }).props as Record<string, unknown>
}

describe('buildPackageColumns', () => {
  it('shows title, subject, grade, item count and status', () => {
    const built = columns()
    const text = (id: string) => {
      const column = built.find((item) => item.id === id)!
      const meta = column.meta as {
        mobileValue?: (row: ExamPackageSummary) => string
      }
      return meta.mobileValue?.(pkg())
    }

    expect(built.map((column) => column.id)).toEqual([
      'title',
      'subject',
      'grade',
      'items',
      'status',
      'actions',
    ])
    expect(text('subject')).toBe('Matematika')
    expect(text('grade')).toBe('Kelas 7')
    expect(text('items')).toBe('12 soal')
    expect(text('status')).toBe('Draf')
  })

  it('offers delete for a draft, a returned and an approved package, with the permission', () => {
    for (const status of ['DRAFT', 'RETURNED', 'APPROVED'] as const) {
      expect(actions({}, pkg({ status })).hideDelete).toBe(false)
    }
    for (const status of ['SUBMITTED', 'LOCKED'] as const) {
      expect(actions({}, pkg({ status })).hideDelete).toBe(true)
    }
    expect(actions({ canDelete: () => false }, pkg()).hideDelete).toBe(true)
  })

  it('asks per row whether the viewer may delete it, so a colleague package has no Hapus', () => {
    const mine = pkg({ createdById: 'u1' })
    const theirs = pkg({ id: 'p2', createdById: 'u2' })
    const canDelete = (row: ExamPackageSummary) => row.createdById === 'u1'

    expect(actions({ canDelete }, mine).hideDelete).toBe(false)
    expect(actions({ canDelete }, theirs).hideDelete).toBe(true)
  })

  it('offers a copy entry only for an approved or scheduled package, with the permission', () => {
    const labels = (status: ExamPackageSummary['status'], canCopy = true) =>
      (actions({ canCopy }, pkg({ status })).items as { label: string }[]).map(
        (entry) => entry.label,
      )

    expect(labels('APPROVED')).toEqual(['Salin'])
    expect(labels('LOCKED')).toEqual(['Salin'])
    for (const status of ['DRAFT', 'SUBMITTED', 'RETURNED'] as const) {
      expect(labels(status)).toEqual([])
    }
    expect(labels('APPROVED', false)).toEqual([])
  })

  it('shows the status of every kind in Indonesian', () => {
    const column = columns().find((item) => item.id === 'status')!
    const mobile = (
      column.meta as { mobileValue: (row: ExamPackageSummary) => string }
    ).mobileValue

    expect(mobile(pkg({ status: 'SUBMITTED' }))).toBe('Menunggu tinjauan')
    expect(mobile(pkg({ status: 'RETURNED' }))).toBe('Dikembalikan')
    expect(mobile(pkg({ status: 'APPROVED' }))).toBe('Disetujui')
    expect(mobile(pkg({ status: 'LOCKED' }))).toBe('Terjadwal')
  })

  it('opens a package for viewing and hides the edit entry', () => {
    const props = actions({}, pkg())

    expect(props.viewLabel).toBe('Lihat')
    expect(props.hideEdit).toBe(true)
  })
})
