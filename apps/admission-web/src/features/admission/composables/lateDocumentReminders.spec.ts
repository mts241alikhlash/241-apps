import { expect, it } from 'vitest'
import { lateDocumentReminders } from './lateDocumentReminders'
import type { AdmissionDocumentType } from '../types'

const type = (
  overrides: Partial<AdmissionDocumentType>,
): AdmissionDocumentType => ({
  id: 'x',
  code: 'X',
  name: 'X',
  isRequired: false,
  requirement: 'LATER',
  lateDueMonths: 3,
  isActive: true,
  sortOrder: 1,
  ...overrides,
})

it('lists missing and rejected LATER types with due date and staff note', () => {
  const types = [
    type({ id: 'ijazah', name: 'Ijazah SD', dueDate: '2026-09-30' }),
    type({ id: 'rapor', name: 'Rapor' }),
    type({ id: 'skl', name: 'SKL' }),
    type({ id: 'kk', name: 'KK', requirement: 'REQUIRED' }),
  ]
  const documents = [
    { documentTypeId: 'rapor', status: 'REJECTED', note: 'Buram' },
    { documentTypeId: 'skl', status: 'PENDING' },
  ]

  expect(lateDocumentReminders(types, documents)).toEqual([
    { name: 'Ijazah SD', dueDate: '2026-09-30', note: null },
    { name: 'Rapor', dueDate: null, note: 'Buram' },
  ])
})
