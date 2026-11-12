import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PATCH, PUT, DELETE } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  PUT: vi.fn(),
  DELETE: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PATCH, PUT, DELETE },
}))

import { examPackageApi } from './examPackageApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

const page = (data: unknown[]) => ({
  data: { data, meta: { total: data.length, page: 1, limit: 10 } },
  response: new Response(null, { status: 200 }),
})

const path = { id: 'p1' }
const questionPath = { id: 'p1', questionId: 'q1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examPackageApi', () => {
  it('lists packages with the given filters', async () => {
    GET.mockResolvedValue(page([{ id: 'p1' }]))
    const query = { page: 2, limit: 10, status: 'DRAFT' as const }
    await expect(examPackageApi.getPackages(query)).resolves.toEqual({
      data: [{ id: 'p1' }],
      meta: { total: 1, page: 1, limit: 10 },
    })
    expect(GET).toHaveBeenCalledWith('/exam-packages', {
      params: { query },
    })
  })

  it('reads one package', async () => {
    GET.mockResolvedValue(ok({ id: 'p1' }))
    await expect(examPackageApi.getPackage('p1')).resolves.toEqual({
      id: 'p1',
    })
    expect(GET).toHaveBeenCalledWith('/exam-packages/{id}', {
      params: { path },
    })
  })

  it('reads one question of a package', async () => {
    GET.mockResolvedValue(ok({ id: 'q1' }))
    await expect(
      examPackageApi.getPackageQuestion('p1', 'q1'),
    ).resolves.toEqual({ id: 'q1' })
    expect(GET).toHaveBeenCalledWith(
      '/exam-packages/{id}/questions/{questionId}',
      {
        params: { path: questionPath },
      },
    )
  })

  it('has no candidate list and no item replacement any more', () => {
    expect('getCandidates' in examPackageApi).toBe(false)
    expect('updatePackage' in examPackageApi).toBe(false)
  })

  it('creates a package', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    const body = { title: 'UTS', subjectId: 's1', gradeId: 'g1' }
    await expect(examPackageApi.createPackage(body)).resolves.toEqual({
      id: 'p1',
    })
    expect(POST).toHaveBeenCalledWith('/exam-packages', { body })
  })

  it('renames a package', async () => {
    PATCH.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.renamePackage('p1', 'UAS')
    expect(PATCH).toHaveBeenCalledWith('/exam-packages/{id}', {
      params: { path },
      body: { title: 'UAS' },
    })
  })

  it('deletes a package', async () => {
    DELETE.mockResolvedValue(ok(undefined))
    await examPackageApi.deletePackage('p1')
    expect(DELETE).toHaveBeenCalledWith('/exam-packages/{id}', {
      params: { path },
    })
  })

  it('copies a package', async () => {
    POST.mockResolvedValue(ok({ id: 'p2' }))
    await expect(examPackageApi.copyPackage('p1')).resolves.toEqual({
      id: 'p2',
    })
    expect(POST).toHaveBeenCalledWith('/exam-packages/{id}/copy', {
      params: { path },
    })
  })

  it('adds a question', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    const body = {
      type: 'TRUE_FALSE' as const,
      bodyHtml: '<p>x</p>',
      content: { answer: { value: true } },
      points: 1,
    }
    await examPackageApi.addQuestion('p1', body)
    expect(POST).toHaveBeenCalledWith('/exam-packages/{id}/questions', {
      params: { path },
      body,
    })
  })

  it('updates a question', async () => {
    PATCH.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.updateQuestion('p1', 'q1', { points: 2 })
    expect(PATCH).toHaveBeenCalledWith(
      '/exam-packages/{id}/questions/{questionId}',
      { params: { path: questionPath }, body: { points: 2 } },
    )
  })

  it('removes a question', async () => {
    DELETE.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.removeQuestion('p1', 'q1')
    expect(DELETE).toHaveBeenCalledWith(
      '/exam-packages/{id}/questions/{questionId}',
      { params: { path: questionPath } },
    )
  })

  it('reorders the questions', async () => {
    PUT.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.reorderQuestions('p1', ['q2', 'q1'])
    expect(PUT).toHaveBeenCalledWith('/exam-packages/{id}/questions/order', {
      params: { path },
      body: { questionIds: ['q2', 'q1'] },
    })
  })

  it('takes questions from another package', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    const body = { sourcePackageId: 'p2', questionIds: ['q3'] }
    await examPackageApi.takeQuestions('p1', body)
    expect(POST).toHaveBeenCalledWith('/exam-packages/{id}/questions/take', {
      params: { path },
      body,
    })
  })

  it('submits a package', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.submitPackage('p1')
    expect(POST).toHaveBeenCalledWith('/exam-packages/{id}/submit', {
      params: { path },
    })
  })

  it('approves a package with and without a note', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    await examPackageApi.approvePackage('p1', 'Bagus')
    await examPackageApi.approvePackage('p1')
    expect(POST).toHaveBeenNthCalledWith(1, '/exam-packages/{id}/approve', {
      params: { path },
      body: { note: 'Bagus' },
    })
    expect(POST).toHaveBeenNthCalledWith(2, '/exam-packages/{id}/approve', {
      params: { path },
      body: {},
    })
  })

  it('returns a package', async () => {
    POST.mockResolvedValue(ok({ id: 'p1' }))
    const body = {
      note: 'Perbaiki',
      questionNotes: [{ questionId: 'q1', note: 'Kunci salah' }],
    }
    await examPackageApi.returnPackage('p1', body)
    expect(POST).toHaveBeenCalledWith('/exam-packages/{id}/return', {
      params: { path },
      body,
    })
  })

  it('adjusts the key of an item', async () => {
    POST.mockResolvedValue(ok({ rescoredSessions: 3 }))
    const body = { resolution: 'BONUS_ALL' as const, reason: 'Soal keliru' }
    await expect(
      examPackageApi.adjustItemKey('p1', 'i1', body),
    ).resolves.toEqual({ rescoredSessions: 3 })
    expect(POST).toHaveBeenCalledWith(
      '/exam-packages/{id}/items/{itemId}/adjust-key',
      { params: { path: { id: 'p1', itemId: 'i1' } }, body },
    )
  })
})
