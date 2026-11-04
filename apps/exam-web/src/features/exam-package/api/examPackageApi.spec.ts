import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examPackageApi } from './examPackageApi'

const { get, post, patch, put, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get, post, patch, put, delete: remove },
}))

describe('examPackageApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists packages with the given filters', () => {
    void examPackageApi.getPackages({ page: 2, limit: 10, status: 'DRAFT' })

    expect(get).toHaveBeenCalledWith('/exam-packages', {
      params: { page: 2, limit: 10, status: 'DRAFT' },
    })
  })

  it('reads one package and one of its questions', () => {
    void examPackageApi.getPackage('p1')
    void examPackageApi.getPackageQuestion('p1', 'q1')

    expect(get).toHaveBeenCalledWith('/exam-packages/p1')
    expect(get).toHaveBeenCalledWith('/exam-packages/p1/questions/q1')
  })

  it('has no candidate list and no item replacement any more', () => {
    expect('getCandidates' in examPackageApi).toBe(false)
    expect('updatePackage' in examPackageApi).toBe(false)
  })

  it('creates, renames, deletes and copies a package', () => {
    const payload = { title: 'UTS', subjectId: 's1', gradeId: 'g1' }
    void examPackageApi.createPackage(payload)
    void examPackageApi.renamePackage('p1', 'UAS')
    void examPackageApi.deletePackage('p1')
    void examPackageApi.copyPackage('p1')

    expect(post).toHaveBeenCalledWith('/exam-packages', payload)
    expect(patch).toHaveBeenCalledWith('/exam-packages/p1', { title: 'UAS' })
    expect(remove).toHaveBeenCalledWith('/exam-packages/p1')
    expect(post).toHaveBeenCalledWith('/exam-packages/p1/copy')
  })

  it('writes, changes, removes, orders and takes questions', () => {
    const question = {
      type: 'TRUE_FALSE' as const,
      bodyHtml: '<p>x</p>',
      content: { answer: { value: true } },
      points: 1,
    }
    void examPackageApi.addQuestion('p1', question)
    void examPackageApi.updateQuestion('p1', 'q1', { points: 2 })
    void examPackageApi.removeQuestion('p1', 'q1')
    void examPackageApi.reorderQuestions('p1', ['q2', 'q1'])
    void examPackageApi.takeQuestions('p1', {
      sourcePackageId: 'p2',
      questionIds: ['q3'],
    })

    expect(post).toHaveBeenCalledWith('/exam-packages/p1/questions', question)
    expect(patch).toHaveBeenCalledWith('/exam-packages/p1/questions/q1', {
      points: 2,
    })
    expect(remove).toHaveBeenCalledWith('/exam-packages/p1/questions/q1')
    expect(put).toHaveBeenCalledWith('/exam-packages/p1/questions/order', {
      questionIds: ['q2', 'q1'],
    })
    expect(post).toHaveBeenCalledWith('/exam-packages/p1/questions/take', {
      sourcePackageId: 'p2',
      questionIds: ['q3'],
    })
  })

  it('submits, approves and returns a package', () => {
    void examPackageApi.submitPackage('p1')
    void examPackageApi.approvePackage('p1', 'Bagus')
    void examPackageApi.returnPackage('p1', {
      note: 'Perbaiki',
      questionNotes: [{ questionId: 'q1', note: 'Kunci salah' }],
    })

    expect(post).toHaveBeenCalledWith('/exam-packages/p1/submit')
    expect(post).toHaveBeenCalledWith('/exam-packages/p1/approve', {
      note: 'Bagus',
    })
    expect(post).toHaveBeenCalledWith('/exam-packages/p1/return', {
      note: 'Perbaiki',
      questionNotes: [{ questionId: 'q1', note: 'Kunci salah' }],
    })
  })

  it('keeps an id inside its own path segment', () => {
    const hostile = '../../users/me?x=1#y'
    const safe = encodeURIComponent(hostile)

    void examPackageApi.getPackage(hostile)
    void examPackageApi.getPackageQuestion(hostile, hostile)
    void examPackageApi.renamePackage(hostile, 'x')
    void examPackageApi.deletePackage(hostile)
    void examPackageApi.copyPackage(hostile)
    void examPackageApi.addQuestion(hostile, {
      type: 'ESSAY',
      bodyHtml: 'x',
      content: { guideHtml: null },
      points: 1,
    })
    void examPackageApi.updateQuestion(hostile, hostile, { points: 1 })
    void examPackageApi.removeQuestion(hostile, hostile)
    void examPackageApi.reorderQuestions(hostile, ['q1'])
    void examPackageApi.takeQuestions(hostile, {
      sourcePackageId: 'p2',
      questionIds: ['q1'],
    })
    void examPackageApi.submitPackage(hostile)
    void examPackageApi.approvePackage(hostile)
    void examPackageApi.returnPackage(hostile, { note: 'x', questionNotes: [] })

    const paths = [
      ...get.mock.calls,
      ...post.mock.calls,
      ...patch.mock.calls,
      ...put.mock.calls,
      ...remove.mock.calls,
    ].map((call) => String(call[0]))
    expect(paths).toHaveLength(13)
    for (const path of paths) expect(path).toContain(safe)
  })
})
