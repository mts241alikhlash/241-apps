import { ServiceUnavailableException } from '@nestjs/common'
import type { ServiceClient } from '@mts241alikhlash/nest-core/service-client'
import { HttpEnrollmentLookupAdapter } from './http-enrollment-lookup.adapter.js'

const baseSummary = {
  id: 'enr-1',
  studentId: 'stu-1',
  classroomId: 'cls-1',
  semesterId: 'sem-1',
  status: 'ACTIVE',
  studentUserId: 'usr-1',
  studentNis: '2024001',
  studentNisn: '0091234567',
  studentName: 'Ahmad Fauzi',
}

function makeAdapter(answer: unknown) {
  const getData = vi.fn(() => Promise.resolve(answer))
  const postData = vi.fn(() => Promise.resolve(answer))
  const malformed = vi.fn((): never => {
    throw new ServiceUnavailableException('malformed')
  })
  const client = {
    getData,
    postData,
    malformed,
  } as unknown as ServiceClient
  return { adapter: new HttpEnrollmentLookupAdapter(client), getData, postData }
}

describe('HttpEnrollmentLookupAdapter', () => {
  it('accepts an enrollment summary carrying studentNisn', async () => {
    const { adapter } = makeAdapter(baseSummary)

    const result = await adapter.findSummary('enr-1')

    expect(result).toEqual(baseSummary)
    expect(result?.studentNisn).toBe('0091234567')
  })

  it('accepts an enrollment summary with null studentNisn', async () => {
    const summaryWithNull = { ...baseSummary, studentNisn: null }
    const { adapter } = makeAdapter(summaryWithNull)

    const result = await adapter.findActiveByStudent('stu-1', 'sem-1')

    expect(result?.studentNisn).toBeNull()
  })

  it('accepts studentNisn in list endpoints', async () => {
    const { adapter } = makeAdapter([baseSummary])

    const rows = await adapter.listByIds(['enr-1'])

    expect(rows[0]?.studentNisn).toBe('0091234567')
  })

  it('rejects a non-string, non-null studentNisn as malformed', async () => {
    const { adapter } = makeAdapter({ ...baseSummary, studentNisn: 12345 })

    await expect(adapter.findSummary('enr-1')).rejects.toThrow('malformed')
  })
})
