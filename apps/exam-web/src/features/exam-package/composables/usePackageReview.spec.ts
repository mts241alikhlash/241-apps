import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { ExamPackageView } from '../types'
import { usePackageReview } from './usePackageReview'

const { loadPackage, loadQuestion, approve, returnPackage } = vi.hoisted(
  () => ({
    loadPackage: vi.fn(),
    loadQuestion: vi.fn(),
    approve: vi.fn(),
    returnPackage: vi.fn(),
  }),
)
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadPackage, loadQuestion, approve, returnPackage },
}))

const view = (count = 3, status: ExamPackageView['status'] = 'SUBMITTED') =>
  ({
    id: 'p1',
    title: 'UAS',
    subjectId: 'math',
    gradeId: 'g7',
    status,
    lockedAt: null,
    createdById: 'u1',
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
    reviews: [],
    items: Array.from({ length: count }, (_, index) => ({
      questionId: `q${index + 1}`,
      questionVersion: 1,
      position: index + 1,
      type: 'TRUE_FALSE' as const,
      marker: index === 0 ? ('NEW' as const) : ('COPIED' as const),
      summary: `Soal ${index + 1}`,
      points: 2,
    })),
  }) satisfies ExamPackageView

async function loaded(
  count = 3,
  status: ExamPackageView['status'] = 'SUBMITTED',
) {
  loadPackage.mockResolvedValue(view(count, status))
  loadQuestion.mockImplementation((_id: string, questionId: string) =>
    Promise.resolve({
      id: questionId,
      type: 'TRUE_FALSE',
      current: {
        bodyHtml: `<p>${questionId}</p>`,
        content: { answer: { value: true } },
        points: 2,
      },
    }),
  )
  const review = usePackageReview(ref('p1'))
  await review.load()
  return review
}

describe('usePackageReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the package and every question of it', async () => {
    const review = await loaded(3)

    expect(review.pkg.value?.items).toHaveLength(3)
    expect(Object.keys(review.questions.value)).toEqual(['q1', 'q2', 'q3'])
    expect(loadQuestion).toHaveBeenCalledWith('p1', 'q2')
  })

  it('never asks for more than eight questions at a time', async () => {
    let running = 0
    let peak = 0
    loadPackage.mockResolvedValue(view(20))
    loadQuestion.mockImplementation(async (_id: string, questionId: string) => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 1))
      running -= 1
      return { id: questionId, type: 'TRUE_FALSE', current: {} }
    })
    const review = usePackageReview(ref('p1'))

    await review.load()

    expect(peak).toBeLessThanOrEqual(8)
    expect(Object.keys(review.questions.value)).toHaveLength(20)
  })

  it('can only review a package that waits for it', async () => {
    expect((await loaded(2, 'SUBMITTED')).canReview.value).toBe(true)
    expect((await loaded(2, 'APPROVED')).canReview.value).toBe(false)
    expect((await loaded(2, 'DRAFT')).canReview.value).toBe(false)
  })

  it('tells a missing package from one that failed to load', async () => {
    loadPackage.mockResolvedValue(null)
    const missing = usePackageReview(ref('p1'))
    await missing.load()
    expect(missing.notFound.value).toBe(true)

    loadPackage.mockRejectedValue(new Error('down'))
    const failing = usePackageReview(ref('p1'))
    await failing.load()
    expect(failing.loadFailed.value).toBe(true)
  })

  it('approves with an optional note', async () => {
    approve.mockResolvedValue({ success: true, data: view() })
    const review = await loaded()

    expect(await review.approve('  Bagus  ')).toBe(true)
    expect(approve).toHaveBeenCalledWith('p1', 'Bagus')

    expect(await review.approve('   ')).toBe(true)
    expect(approve).toHaveBeenLastCalledWith('p1', undefined)
  })

  it('shows the server message when approving is refused', async () => {
    approve.mockResolvedValue({
      success: false,
      error: 'Anda tidak bisa menyetujui paket yang Anda susun sendiri',
    })
    const review = await loaded()

    expect(await review.approve()).toBe(false)
    expect(review.error.value).toBe(
      'Anda tidak bisa menyetujui paket yang Anda susun sendiri',
    )
  })

  it('needs a general note to return a package', async () => {
    const review = await loaded()

    expect(await review.returnPackage('   ')).toBe(false)
    expect(review.returnError.value).toBe('Catatan wajib diisi')
    expect(returnPackage).not.toHaveBeenCalled()
  })

  it('returns the package with only the notes that have text', async () => {
    returnPackage.mockResolvedValue({ success: true, data: view() })
    const review = await loaded()
    review.setNote('q1', '  Kunci salah ')
    review.setNote('q2', '   ')
    review.setNote('ghost', 'Tidak ada')

    expect(await review.returnPackage('Perbaiki')).toBe(true)
    expect(returnPackage).toHaveBeenCalledWith('p1', {
      note: 'Perbaiki',
      questionNotes: [{ questionId: 'q1', note: 'Kunci salah' }],
    })
  })

  it('keeps the typed notes until the package is returned', async () => {
    const review = await loaded()

    review.setNote('q1', 'Kunci salah')
    review.setNote('q1', 'Kunci salah dan ejaan')

    expect(review.notes.value.q1).toBe('Kunci salah dan ejaan')
  })

  it('keeps the page when one question cannot be read, and holds back the decision', async () => {
    const review = await loaded(3)
    loadQuestion.mockImplementation((_id: string, questionId: string) =>
      questionId === 'q2'
        ? Promise.reject(new Error('down'))
        : Promise.resolve({ id: questionId, type: 'TRUE_FALSE', current: {} }),
    )

    await review.load()

    expect(review.loadFailed.value).toBe(false)
    expect(review.pkg.value?.items).toHaveLength(3)
    expect([...review.unreadable.value]).toEqual(['q2'])
    expect(review.canDecide.value).toBe(false)
  })

  it('holds back the decision while the questions are still loading', async () => {
    loadPackage.mockResolvedValue(view(2))
    let release: (value: unknown) => void = () => undefined
    loadQuestion.mockReturnValue(new Promise((resolve) => (release = resolve)))
    const review = usePackageReview(ref('p1'))
    const loading = review.load()
    await flushPromises()

    expect(review.canDecide.value).toBe(false)
    release({ id: 'x', type: 'TRUE_FALSE', current: {} })
    await loading
    expect(review.canDecide.value).toBe(true)
  })

  it('reloads the package when the server says someone else already decided', async () => {
    approve.mockResolvedValue({
      success: false,
      error: 'Sudah disetujui',
      status: 409,
    })
    const review = await loaded()
    loadPackage.mockClear()

    await review.approve()

    expect(loadPackage).toHaveBeenCalledTimes(1)
  })

  it('keeps the return error apart from the approve error', async () => {
    approve.mockResolvedValue({ success: false, error: 'Gagal setujui' })
    returnPackage.mockResolvedValue({
      success: false,
      error: 'Gagal kembalikan',
    })
    const review = await loaded()

    await review.approve()
    await review.returnPackage('Perbaiki')

    expect(review.error.value).toBe('Gagal setujui')
    expect(review.returnError.value).toBe('Gagal kembalikan')
  })
})
