import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExamPackageStore } from './examPackageStore'

describe('examPackageStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('names subjects and grades by id and falls back to a dash', () => {
    const store = useExamPackageStore()
    store.subjects = [{ id: 'math', name: 'Matematika' }]
    store.grades = [
      { id: 'g7', level: 7, name: null },
      { id: 'g8', level: 8, name: 'VIII' },
    ]

    expect(store.subjectName('math')).toBe('Matematika')
    expect(store.subjectName('other')).toBe('-')
    expect(store.gradeName('g7')).toBe('Kelas 7')
    expect(store.gradeName('g8')).toBe('VIII')
    expect(store.gradeName('other')).toBe('-')
  })

  it('offers subject and grade options for the filters', () => {
    const store = useExamPackageStore()
    store.subjects = [{ id: 'math', name: 'Matematika' }]
    store.grades = [{ id: 'g7', level: 7, name: null }]

    expect(store.subjectOptions).toEqual([{ id: 'math', name: 'Matematika' }])
    expect(store.gradeOptions).toEqual([{ id: 'g7', name: 'Kelas 7' }])
  })
})
