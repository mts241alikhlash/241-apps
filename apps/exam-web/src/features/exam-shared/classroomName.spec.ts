import { describe, expect, it } from 'vitest'
import {
  classOfClassroom,
  gradeNumberOf,
  gradeOfClassroom,
} from './classroomName'

describe('classroomName', () => {
  it('extracts numeric and roman grade levels', () => {
    expect(gradeNumberOf('Kelas 7-A')).toBe(7)
    expect(gradeNumberOf('8B')).toBe(8)
    expect(gradeNumberOf('VII')).toBe(7)
    expect(gradeNumberOf('VII-A')).toBe(7)
    expect(gradeNumberOf('VIII-1')).toBe(8)
    expect(gradeNumberOf('Kelas IX B')).toBe(9)
    expect(gradeNumberOf('Ruang Lab')).toBeNull()
    expect(gradeNumberOf(null)).toBeNull()
  })

  it('formats grade and classroom labels cleanly', () => {
    expect(gradeOfClassroom('VII-A')).toBe('Kelas 7')
    expect(gradeOfClassroom('Kelas 8-B')).toBe('Kelas 8')
    expect(gradeOfClassroom('IX')).toBe('Kelas 9')
    expect(gradeOfClassroom(null)).toBe('-')
    expect(classOfClassroom(' VII-A ')).toBe(' VII-A ')
    expect(classOfClassroom('   ')).toBe('-')
    expect(classOfClassroom(null)).toBe('-')
  })
})
