import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExamBankStore } from './examBankStore'

const pair = (
  subjectId: string,
  subjectName: string,
  gradeId: string,
  gradeLevel: number,
) => ({ subjectId, subjectName, gradeId, gradeLevel, gradeName: null })

describe('exam bank store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('offers a teacher only the subjects and grades of their pairs', () => {
    const store = useExamBankStore()
    store.scope = {
      all: false,
      employeeId: 'emp-1',
      pairs: [
        pair('math', 'Matematika', 'g7', 7),
        pair('math', 'Matematika', 'g8', 8),
        pair('ipa', 'IPA', 'g7', 7),
      ],
    }

    expect(store.manageAll).toBe(false)
    expect(store.subjectOptions.map((s) => s.name)).toEqual([
      'IPA',
      'Matematika',
    ])
    expect(store.gradeOptionsFor('math').map((g) => g.name)).toEqual([
      'Kelas 7',
      'Kelas 8',
    ])
    expect(store.gradeOptionsFor('ipa').map((g) => g.id)).toEqual(['g7'])
    expect(store.gradeOptions.map((g) => g.id)).toEqual(['g7', 'g8'])
  })

  it('offers everything the lists hold to a user who manages every question', () => {
    const store = useExamBankStore()
    store.scope = { all: true, employeeId: null, pairs: [] }
    store.subjects = [
      { id: 'b', name: 'Bahasa Arab' },
      { id: 'a', name: 'Akidah' },
    ]
    store.grades = [
      { id: 'g8', level: 8, name: null },
      { id: 'g7', level: 7, name: 'VII' },
    ]

    expect(store.manageAll).toBe(true)
    expect(store.subjectOptions.map((s) => s.name)).toEqual([
      'Akidah',
      'Bahasa Arab',
    ])
    expect(store.gradeOptionsFor('a').map((g) => g.name)).toEqual([
      'VII',
      'Kelas 8',
    ])
  })

  it('names an id from either source, and a dash when unknown', () => {
    const store = useExamBankStore()
    store.scope = {
      all: false,
      employeeId: 'emp-1',
      pairs: [pair('math', 'Matematika', 'g7', 7)],
    }

    expect(store.subjectName('math')).toBe('Matematika')
    expect(store.gradeName('g7')).toBe('Kelas 7')
    expect(store.subjectName('ghost')).toBe('-')
    expect(store.gradeName('ghost')).toBe('-')
  })
})
