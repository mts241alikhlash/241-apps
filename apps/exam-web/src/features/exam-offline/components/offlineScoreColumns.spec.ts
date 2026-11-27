import { describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import type { OfflineSchedule } from '../types'
import { buildOfflineScheduleColumns } from './offlineScoreColumns'

const schedule: OfflineSchedule = {
  scheduleId: 's1',
  activityId: 'act',
  subjectName: 'Tafsir',
  classroomName: 'VII A',
  offlineKind: 'PRACTICAL',
  maxScore: 50,
  startsAt: '2026-11-30T01:00:00.000Z',
  endsAt: '2026-11-30T02:30:00.000Z',
  registered: 30,
  scored: 20,
  absent: 2,
  missing: 8,
  published: 15,
}

type Cell = (context: { row: { original: OfflineSchedule } }) => unknown

const cellOf = (id: string, onOpen = vi.fn()) => {
  const column = buildOfflineScheduleColumns({ onOpen }).find(
    (item) => item.id === id,
  )
  if (!column) throw new Error(`no column ${id}`)
  return (column.cell as Cell)({ row: { original: schedule } })
}

describe('buildOfflineScheduleColumns', () => {
  it('lists subject, class, kind, date, times, maximum, the four counts and the action', () => {
    expect(
      buildOfflineScheduleColumns({ onOpen: vi.fn() }).map(
        (column) => column.header,
      ),
    ).toEqual([
      'Mata Pelajaran',
      'Kelas',
      'Jenis',
      'Tanggal',
      'Mulai',
      'Selesai',
      'Maksimum',
      'Dinilai',
      'Tidak hadir',
      'Belum dinilai',
      'Terkirim',
      'Aksi',
    ])
  })

  it('shows the kind in English and the counts of the row', () => {
    expect(cellOf('subject')).toBe('Tafsir')
    expect(cellOf('classroom')).toBe('VII A')
    expect(cellOf('kind')).toBe('Practical')
    expect(cellOf('maxScore')).toBe('50')
    expect(cellOf('scored')).toBe('20')
    expect(cellOf('absent')).toBe('2')
    expect(cellOf('missing')).toBe('8')
    expect(cellOf('published')).toBe('15')
  })

  it('opens the schedule from the Buka row action', () => {
    const onOpen = vi.fn()
    const action = cellOf('actions', onOpen) as VNode
    const props = action.props as { viewLabel: string; onView: () => void }
    expect(props.viewLabel).toBe('Buka')
    props.onView()
    expect(onOpen).toHaveBeenCalledWith(schedule)
  })
})
