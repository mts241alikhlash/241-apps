import { describe, expect, it, vi } from 'vitest'
import { h, type VNode } from 'vue'
import { buildBuilderColumns } from './builderColumns'
import type { ExamPackageItemView } from '../types'

const item = (
  position: number,
  overrides: Partial<ExamPackageItemView> = {},
): ExamPackageItemView => ({
  questionId: `q${position}`,
  questionVersion: 1,
  position,
  type: 'TRUE_FALSE',
  marker: 'NEW',
  summary: `Soal ${position}`,
  points: 2,
  ...overrides,
})

function columns(
  overrides: Partial<Parameters<typeof buildBuilderColumns>[0]> = {},
) {
  return buildBuilderColumns({
    canEdit: true,
    canAdjustKey: false,
    onAdjustKey: vi.fn(),
    total: 3,
    noteOf: () => undefined,
    onOpen: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  })
}

const actionProps = (
  options: Parameters<typeof buildBuilderColumns>[0] extends infer T
    ? Partial<T>
    : never,
  row: ExamPackageItemView,
) => {
  const column = columns(options).find(
    (candidate) => candidate.id === 'actions',
  )!
  const cell = column.cell as (ctx: {
    row: { original: ExamPackageItemView }
  }) => VNode
  return cell({ row: { original: row } }).props as Record<string, unknown>
}

describe('buildBuilderColumns', () => {
  it('lists number, question, kind, origin, points and actions', () => {
    expect(columns().map((column) => column.id)).toEqual([
      'position',
      'summary',
      'type',
      'marker',
      'points',
      'actions',
    ])
  })

  it('shows the origin of a question in Indonesian', () => {
    const column = columns().find((candidate) => candidate.id === 'marker')!
    const mobile = (
      column.meta as { mobileValue: (row: ExamPackageItemView) => string }
    ).mobileValue

    expect(mobile(item(1, { marker: 'NEW' }))).toBe('Baru')
    expect(mobile(item(1, { marker: 'CHANGED' }))).toBe('Diubah')
    expect(mobile(item(1, { marker: 'COPIED' }))).toBe('Salinan')
  })

  it('puts the note of a returned question under its summary', () => {
    const column = columns({
      noteOf: (id) => (id === 'q2' ? 'Kunci salah' : undefined),
    }).find((candidate) => candidate.id === 'summary')!
    const render = column.cell as (ctx: {
      row: { original: ExamPackageItemView }
    }) => unknown
    const text = (row: ExamPackageItemView) =>
      JSON.stringify(render({ row: { original: row } }))

    expect(text(item(2))).toContain('Kunci salah')
    expect(text(item(1))).not.toContain('Kunci salah')
    expect(h).toBeDefined()
  })

  it('offers change and remove while the package can be edited, only a look otherwise', () => {
    const editable = actionProps({ canEdit: true }, item(2))
    const readOnly = actionProps({ canEdit: false }, item(2))

    expect(editable.hideEdit).toBe(true)
    expect(editable.viewLabel).toBe('Ubah')
    expect(readOnly.viewLabel).toBe('Lihat')
    expect(editable.hideDelete).toBe(false)
    expect(readOnly.hideEdit).toBe(true)
    expect(readOnly.hideDelete).toBe(true)
    expect(typeof readOnly.onView).toBe('function')
  })

  it('moves up and down in the middle, never past the ends', () => {
    const labels = (row: ExamPackageItemView) =>
      (
        actionProps({ canEdit: true, total: 3 }, row).items as {
          label: string
          disabled?: boolean
        }[]
      ).map((entry) => [entry.label, entry.disabled ?? false])

    expect(labels(item(1))).toEqual([
      ['Naik', true],
      ['Turun', false],
    ])
    expect(labels(item(2))).toEqual([
      ['Naik', false],
      ['Turun', false],
    ])
    expect(labels(item(3))).toEqual([
      ['Naik', false],
      ['Turun', true],
    ])
  })

  it('has no move entries when the package cannot be edited', () => {
    expect(actionProps({ canEdit: false }, item(2)).items).toEqual([])
  })

  it('moves the row it was chosen on', () => {
    const onMove = vi.fn()
    const items = actionProps({ canEdit: true, onMove }, item(2)).items as {
      label: string
      onClick: () => void
    }[]

    items.find((entry) => entry.label === 'Turun')!.onClick()

    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'q2' }),
      'down',
    )
  })
})
