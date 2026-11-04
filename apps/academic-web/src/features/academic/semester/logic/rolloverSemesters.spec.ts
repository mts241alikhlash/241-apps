import { describe, expect, it } from 'vitest'
import type { Semester } from '../types'
import {
  getRolloverSourceSemesters,
  getRolloverTargetSemesters,
  resolveDefaultRolloverPair,
} from './rolloverSemesters'

function createSemester(
  id: string,
  academicYearId: string,
  typeName: 'ODD' | 'EVEN',
  isActive = false,
): Semester {
  return {
    id,
    academicYearId,
    typeId: `type-${typeName.toLowerCase()}`,
    type: { id: `type-${typeName.toLowerCase()}`, name: typeName },
    isActive,
    academicYear: {
      id: academicYearId,
      name: academicYearId === 'ay-2024' ? '2024/2025' : '2025/2026',
    },
  }
}

describe('rolloverSemesters logic', () => {
  const sem2024Ganjil = createSemester('s1', 'ay-2024', 'ODD')
  const sem2024Genap = createSemester('s2', 'ay-2024', 'EVEN')
  const sem2025Ganjil = createSemester('s3', 'ay-2025', 'ODD', true)
  const sem2025Genap = createSemester('s4', 'ay-2025', 'EVEN')

  const allSemesters = [
    sem2024Ganjil,
    sem2024Genap,
    sem2025Ganjil,
    sem2025Genap,
  ]

  describe('getRolloverSourceSemesters', () => {
    it('returns only ODD semesters', () => {
      const sources = getRolloverSourceSemesters(allSemesters)
      expect(sources).toHaveLength(2)
      expect(sources.map((s) => s.id)).toEqual(['s1', 's3'])
      expect(sources.every((s) => s.type?.name === 'ODD')).toBe(true)
    })

    it('returns empty array when no ODD semester exists', () => {
      expect(getRolloverSourceSemesters([sem2024Genap, sem2025Genap])).toEqual(
        [],
      )
    })
  })

  describe('getRolloverTargetSemesters', () => {
    it('returns only EVEN semesters from the same academic year', () => {
      const targets = getRolloverTargetSemesters(allSemesters, 's1')
      expect(targets).toHaveLength(1)
      expect(targets[0].id).toBe('s2')
      expect(targets[0].academicYearId).toBe('ay-2024')
    })

    it('excludes EVEN semesters from other academic years (no cross-year rollover)', () => {
      const targets = getRolloverTargetSemesters(allSemesters, 's3')
      expect(targets).toHaveLength(1)
      expect(targets[0].id).toBe('s4')
      expect(targets.some((s) => s.id === 's2')).toBe(false)
    })

    it('returns empty array if sourceSemesterId is not provided or invalid', () => {
      expect(getRolloverTargetSemesters(allSemesters, '')).toEqual([])
      expect(getRolloverTargetSemesters(allSemesters, 'non-existent')).toEqual(
        [],
      )
    })

    it('returns empty array if selected academic year has no EVEN semester created yet', () => {
      const orphanGanjil = createSemester('s5', 'ay-2026', 'ODD')
      const targets = getRolloverTargetSemesters(
        [...allSemesters, orphanGanjil],
        's5',
      )
      expect(targets).toEqual([])
    })
  })

  describe('resolveDefaultRolloverPair', () => {
    it('defaults to active ODD semester and its EVEN sibling', () => {
      const pair = resolveDefaultRolloverPair(allSemesters)
      expect(pair.sourceSemesterId).toBe('s3')
      expect(pair.targetSemesterId).toBe('s4')
    })

    it('finds the ODD sibling when an EVEN semester is the active one', () => {
      const sem2024ActiveGenap = createSemester('s2', 'ay-2024', 'EVEN', true)
      const list = [sem2024Ganjil, sem2024ActiveGenap]
      const pair = resolveDefaultRolloverPair(list)
      expect(pair.sourceSemesterId).toBe('s1')
      expect(pair.targetSemesterId).toBe('s2')
    })

    it('handles empty semester list gracefully', () => {
      expect(resolveDefaultRolloverPair([])).toEqual({
        sourceSemesterId: '',
        targetSemesterId: '',
      })
    })

    it('handles academic year without EVEN semester by leaving target empty', () => {
      const orphanGanjil = createSemester('s5', 'ay-2026', 'ODD', true)
      const pair = resolveDefaultRolloverPair([orphanGanjil])
      expect(pair.sourceSemesterId).toBe('s5')
      expect(pair.targetSemesterId).toBe('')
    })
  })
})
