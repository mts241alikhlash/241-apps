// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreSheet from './ScoreSheet.vue'

const students = [
  {
    studentId: 'a',
    participantNumber: '25-001',
    name: 'Ahmad',
    absent: false,
  },
  {
    studentId: 'b',
    participantNumber: '25-002',
    name: 'Budi',
    absent: true,
  },
]

const mountSheet = () =>
  mount(ScoreSheet, {
    props: {
      subject: 'Tafsir',
      classroom: 'VII A',
      kind: 'Written',
      maxScore: 50,
      date: 'Senin, 30 November 2026',
      startsAt: '2026-11-30T01:00:00.000Z',
      endsAt: '2026-11-30T02:30:00.000Z',
      students,
    },
    global: { stubs: { LetterheadKop: true } },
  })

describe('ScoreSheet', () => {
  it('prints the header with the subject, class, kind, maximum and times', () => {
    const text = mountSheet().get('.sheet-head').text()
    expect(text).toContain('Score Sheet')
    expect(text).toContain('Tafsir')
    expect(text).toContain('VII A')
    expect(text).toContain('Offline · Written')
    expect(text).toMatch(/Nilai Maksimal\s*:\s*50/)
    expect(text).toMatch(/Mulai\s*:\s*\d{2}:\d{2}/)
    expect(text).toMatch(/Selesai\s*:\s*\d{2}:\d{2}/)
  })

  it('lists every student with an empty score box, and absent students as TIDAK HADIR', () => {
    const rows = mountSheet().findAll('.sheet-table tbody tr')
    expect(rows).toHaveLength(2)
    const first = rows[0].findAll('td').map((cell) => cell.text())
    expect(first).toEqual(['1', '25-001', 'Ahmad', '', ''])
    expect(rows[0].find('.score-box').exists()).toBe(true)
    expect(rows[1].text()).toContain('TIDAK HADIR')
    expect(rows[1].find('.score-box').exists()).toBe(false)
  })

  it('ends with the signature line of the teacher', () => {
    const signature = mountSheet().get('.sheet-signature')
    expect(signature.text()).toContain('Guru Mata Pelajaran')
    expect(signature.find('.sheet-signature-name').exists()).toBe(true)
  })
})
