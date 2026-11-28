// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AttendanceSheet from './AttendanceSheet.vue'

const students = [
  {
    studentId: 's1',
    name: 'Ahmad Fauzi',
    classroomName: 'IX-A',
    participantNumber: '25-001',
  },
]

const mountSheet = (extra: Record<string, unknown> = {}) =>
  mount(AttendanceSheet, {
    props: {
      roomName: 'Ruang 1',
      date: 'Senin, 23 November 2026',
      packages: 'Quran Hadits',
      startsAt: '2026-11-23T00:00:00.000Z',
      endsAt: '2026-11-23T01:15:00.000Z',
      students,
      ...extra,
    },
    global: { stubs: { LetterheadKop: true } },
  })

describe('AttendanceSheet', () => {
  it('prints the supervisor and technician names under the signature lines', () => {
    const wrapper = mountSheet({
      supervisorName: 'Ahyar Sudrajat, S.Pd.I',
      technicianName: 'Fajar Hapidin, S.Sos',
    })

    const names = wrapper.findAll('.sheet-signature-name')
    expect(names.map((name) => name.text())).toEqual([
      'Ahyar Sudrajat, S.Pd.I',
      'Fajar Hapidin, S.Sos',
    ])
  })

  it('labels the start and the end of the exam', () => {
    const text = mountSheet().text()

    expect(text).toMatch(/Mulai\s*:\s*\d{2}:\d{2}/)
    expect(text).toMatch(/Selesai\s*:\s*\d{2}:\d{2}/)
  })

  it('leaves the name lines empty when nobody is assigned', () => {
    const wrapper = mountSheet()

    expect(
      wrapper.findAll('.sheet-signature-name').map((name) => name.text()),
    ).toEqual(['', ''])
  })

  it('does not claim the print stack when stacked inside another document', () => {
    expect(mountSheet({ stacked: true }).classes()).not.toContain('print-stack')
    expect(mountSheet().classes()).toContain('print-stack')
  })
})
