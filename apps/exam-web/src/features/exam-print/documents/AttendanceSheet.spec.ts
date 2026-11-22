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
      timeRange: '07:00 - 08:15',
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
