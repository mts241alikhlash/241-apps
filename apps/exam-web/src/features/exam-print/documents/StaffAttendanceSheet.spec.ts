// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaffAttendanceSheet from './StaffAttendanceSheet.vue'

const supervisors = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    key: `s${index}`,
    name: `Pengawas ${index + 1}`,
    roomName: `Ruang ${(index % 6) + 1}`,
    subject: 'Quran Hadits',
    time: '07:00 - 08:15',
  }))

const technicians = [
  { key: 't1', name: 'Fajar', roomName: 'Ruang 1', time: '07:00 - 11:15' },
]

const mountSheet = (count: number) =>
  mount(StaffAttendanceSheet, {
    props: {
      date: 'Senin, 23 November 2026',
      supervisors: supervisors(count),
      technicians,
    },
    global: { stubs: { LetterheadKop: true } },
  })

describe('StaffAttendanceSheet', () => {
  it('keeps eighteen supervisors on one page, then the technicians', () => {
    const wrapper = mountSheet(18)

    expect(wrapper.findAll('section')).toHaveLength(2)
    expect(wrapper.text()).toContain('Daftar Hadir Pengawas')
    expect(wrapper.text()).toContain('Daftar Hadir Teknisi')
    expect(
      wrapper.findAll('section')[0].findAll('.sheet-table tbody tr'),
    ).toHaveLength(18)
  })

  it('moves to a second supervisor page only beyond twenty', () => {
    const wrapper = mountSheet(21)

    expect(wrapper.findAll('section')).toHaveLength(3)
  })

  it('prints the principal and the curriculum deputy names without a line', () => {
    const wrapper = mountSheet(3)

    const names = wrapper.findAll('.sheet-signature-name')
    expect(names.map((name) => name.text())).toEqual([
      'Abdul Mugni Lutfi, S.Pd.I',
      'Ahmad Aripin, S.Pd.I',
    ])
    expect(wrapper.find('.sheet-signature-line').exists()).toBe(false)
  })
})
