import { describe, expect, it, vi } from 'vitest'
import type { ColumnDef } from '@tanstack/vue-table'
import {
  buildDayColumns,
  buildRoomReportColumns,
  buildSubjectColumns,
} from './roomReportColumns'
import { groupReports } from '../composables/useReportHierarchy'
import type { RoomReportStatus, RoomReportSummary } from '../types'

const report = (status: RoomReportStatus): RoomReportSummary => ({
  roomId: 'r1',
  roomCode: 'R01',
  roomName: 'Ruang 01',
  slotId: 's1',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T02:00:00.000Z',
  status,
  registeredCount: 10,
  reportId: null,
  hasAttachment: false,
  attachmentName: null,
  subjectNames: ['Matematika'],
  supervisorName: null,
})

const actionProps = <T>(columns: ColumnDef<T>[], original: T) => {
  const column = columns.find((item) => item.id === 'actions')
  const cell = column?.cell as (ctx: { row: { original: T } }) => {
    props: {
      manageLabel: string
      items: { label: string; disabled?: boolean; onClick: () => void }[]
      onManage: () => void
    }
  }
  return cell({ row: { original } }).props
}

const handlers = () => ({
  onOpen: vi.fn(),
  onPrint: vi.fn(),
  onSubmit: vi.fn(),
})

describe('report action cells', () => {
  it('room level disables Serahkan unless DRAFT and wires handlers', () => {
    const h = handlers()
    const columns = buildRoomReportColumns(h)
    const draft = report('DRAFT')
    const props = actionProps(columns, draft)
    expect(props.manageLabel).toBe('Lihat')
    expect(props.items.map((item) => item.label)).toEqual(['Cetak', 'Serahkan'])
    props.onManage()
    props.items[0].onClick()
    props.items[1].onClick()
    expect(h.onOpen).toHaveBeenCalledWith(draft)
    expect(h.onPrint).toHaveBeenCalledWith(draft)
    expect(h.onSubmit).toHaveBeenCalledWith(draft)
    expect(actionProps(columns, report('SUBMITTED')).items[1].disabled).toBe(
      true,
    )
  })

  it('day and subject levels disable Serahkan with nothing in DRAFT', () => {
    const [draftDay] = groupReports([report('DRAFT')], 'Asia/Jakarta')
    const [lockedDay] = groupReports([report('VERIFIED')], 'Asia/Jakarta')
    const dayColumns = buildDayColumns(handlers())
    expect(actionProps(dayColumns, draftDay).items[1].disabled).toBe(false)
    expect(actionProps(dayColumns, lockedDay).items[1].disabled).toBe(true)
    const subjectColumns = buildSubjectColumns(handlers())
    expect(
      actionProps(subjectColumns, draftDay.subjects[0]).items[1].disabled,
    ).toBe(false)
    expect(
      actionProps(subjectColumns, lockedDay.subjects[0]).items[1].disabled,
    ).toBe(true)
  })
})

describe('supervisor without a name', () => {
  it('shows Belum ditentukan for a room whose supervisor is not set', () => {
    const columns = buildRoomReportColumns(handlers())
    const column = columns.find((item) => item.id === 'supervisor')
    const cell = column?.cell as (ctx: {
      row: { original: RoomReportSummary }
    }) => string
    expect(cell({ row: { original: report('DRAFT') } })).toBe(
      'Belum ditentukan',
    )
  })
})
