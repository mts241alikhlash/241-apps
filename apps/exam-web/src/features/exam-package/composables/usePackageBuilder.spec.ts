import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type { ExamPackageView } from '../types'
import { usePackageBuilder } from './usePackageBuilder'

const { loadPackage, reorder, removeQuestion, submit, permissions, user } =
  vi.hoisted(() => ({
    loadPackage: vi.fn(),
    reorder: vi.fn(),
    removeQuestion: vi.fn(),
    submit: vi.fn(),
    permissions: new Set<string>(),
    user: { value: { id: 'u1' } },
  }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadPackage, reorder, removeQuestion, submit },
}))
vi.mock('@/features/platform/auth', () => ({
  useAuthSession: () => ({
    user,
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

const view = (overrides: Partial<ExamPackageView> = {}): ExamPackageView => ({
  id: 'p1',
  title: 'UAS',
  subjectId: 'math',
  gradeId: 'g7',
  status: 'DRAFT',
  lockedAt: null,
  createdById: 'u1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
  reviews: [],
  items: ['q1', 'q2', 'q3'].map((questionId, index) => ({
    questionId,
    questionVersion: 1,
    position: index + 1,
    type: 'TRUE_FALSE' as const,
    marker: 'NEW' as const,
    summary: questionId,
    points: 2,
  })),
  ...overrides,
})

async function loaded(overrides: Partial<ExamPackageView> = {}) {
  loadPackage.mockResolvedValue(view(overrides))
  const builder = usePackageBuilder(ref('p1'))
  await builder.load()
  return builder
}

describe('usePackageBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-packages.update')
    user.value = { id: 'u1' }
  })

  it('lets the creator with the permission edit a draft, a returned and an approved package', async () => {
    for (const status of ['DRAFT', 'RETURNED', 'APPROVED'] as const) {
      expect((await loaded({ status })).canEdit.value).toBe(true)
    }
  })

  it('refuses edits on a submitted or scheduled package', async () => {
    for (const status of ['SUBMITTED', 'LOCKED'] as const) {
      expect((await loaded({ status })).canEdit.value).toBe(false)
    }
  })

  it('refuses a colleague, and lets someone who manages every package through', async () => {
    user.value = { id: 'u2' }
    expect((await loaded()).canEdit.value).toBe(false)

    permissions.add('exam-questions.manage-all')
    expect((await loaded()).canEdit.value).toBe(true)
  })

  it('refuses everything without the update permission', async () => {
    permissions.clear()

    expect((await loaded()).canEdit.value).toBe(false)
  })

  it('offers Ajukan only for a draft or returned package with questions', async () => {
    expect((await loaded()).canSubmit.value).toBe(true)
    expect((await loaded({ status: 'RETURNED' })).canSubmit.value).toBe(true)
    expect((await loaded({ status: 'APPROVED' })).canSubmit.value).toBe(false)
    expect((await loaded({ items: [] })).canSubmit.value).toBe(false)
  })

  it('moves a question down by sending the whole new order, then reloads', async () => {
    reorder.mockResolvedValue({ success: true, data: view() })
    const builder = await loaded()

    await builder.move('q1', 'down')

    expect(reorder).toHaveBeenCalledWith('p1', ['q2', 'q1', 'q3'])
    expect(loadPackage).toHaveBeenCalledTimes(2)
  })

  it('cannot move the first question up or the last one down', async () => {
    const builder = await loaded()

    await builder.move('q1', 'up')
    await builder.move('q3', 'down')

    expect(reorder).not.toHaveBeenCalled()
  })

  it('shows the server message and reloads when another change got there first', async () => {
    reorder.mockResolvedValue({
      success: false,
      error: 'Status paket sudah berubah, muat ulang',
      status: 409,
    })
    const builder = await loaded()

    await builder.move('q2', 'up')

    expect(builder.error.value).toBe('Status paket sudah berubah, muat ulang')
    expect(loadPackage).toHaveBeenCalledTimes(2)
  })

  it('removes a question and reloads', async () => {
    removeQuestion.mockResolvedValue({ success: true, data: view() })
    const builder = await loaded()

    await builder.remove('q2')

    expect(removeQuestion).toHaveBeenCalledWith('p1', 'q2')
    expect(loadPackage).toHaveBeenCalledTimes(2)
  })

  it('refuses to submit an empty package without asking the server', async () => {
    const builder = await loaded({ items: [] })

    await builder.submit()

    expect(submit).not.toHaveBeenCalled()
    expect(builder.error.value).toBe('Paket belum berisi soal')
  })

  it('submits and reloads', async () => {
    submit.mockResolvedValue({ success: true, data: view() })
    const builder = await loaded()

    await builder.submit()

    expect(submit).toHaveBeenCalledWith('p1')
    expect(loadPackage).toHaveBeenCalledTimes(2)
  })

  it('tells a missing package from one that failed to load', async () => {
    loadPackage.mockResolvedValue(null)
    const missing = usePackageBuilder(ref('p1'))
    await missing.load()
    expect(missing.notFound.value).toBe(true)

    loadPackage.mockRejectedValue(new Error('down'))
    const failing = usePackageBuilder(ref('p1'))
    await failing.load()
    expect(failing.loadFailed.value).toBe(true)
    expect(failing.notFound.value).toBe(false)
  })

  it('finds the notes of the last return, per question', async () => {
    const builder = await loaded({
      status: 'RETURNED',
      reviews: [
        {
          id: 'r1',
          action: 'RETURN',
          byUserId: 'u9',
          note: 'Lama',
          questionNotes: [{ questionId: 'q1', note: 'Lama' }],
          createdAt: '2026-10-29T00:00:00.000Z',
        },
        {
          id: 'r2',
          action: 'SUBMIT',
          byUserId: 'u1',
          note: null,
          questionNotes: [],
          createdAt: '2026-10-29T01:00:00.000Z',
        },
        {
          id: 'r3',
          action: 'RETURN',
          byUserId: 'u9',
          note: 'Perbaiki',
          questionNotes: [{ questionId: 'q2', note: 'Kunci salah' }],
          createdAt: '2026-10-29T02:00:00.000Z',
        },
      ],
    })

    expect(builder.lastReturn.value?.note).toBe('Perbaiki')
    expect(builder.noteOf('q2')).toBe('Kunci salah')
    expect(builder.noteOf('q1')).toBeUndefined()
  })

  it('shows no notes once the package is no longer returned', async () => {
    const builder = await loaded({
      status: 'DRAFT',
      reviews: [
        {
          id: 'r3',
          action: 'RETURN',
          byUserId: 'u9',
          note: 'Perbaiki',
          questionNotes: [{ questionId: 'q2', note: 'Kunci salah' }],
          createdAt: '2026-10-29T02:00:00.000Z',
        },
      ],
    })

    expect(builder.lastReturn.value).toBeNull()
    expect(builder.noteOf('q2')).toBeUndefined()
  })

  it('keeps the newest package when an older load answers last', async () => {
    const id = ref('p1')
    const builder = usePackageBuilder(id)
    let release: (value: ExamPackageView) => void = () => undefined
    loadPackage.mockReturnValueOnce(
      new Promise<ExamPackageView>((resolve) => (release = resolve)),
    )
    const slow = builder.load()
    id.value = 'p2'
    loadPackage.mockResolvedValueOnce(view({ id: 'p2', title: 'Baru' }))
    await builder.load()

    release(view({ id: 'p1', title: 'Lama' }))
    await slow

    expect(builder.pkg.value?.title).toBe('Baru')
  })

  it('forgets the error of the previous package when the id changes', async () => {
    const id = ref('p1')
    loadPackage.mockResolvedValue(view())
    removeQuestion.mockResolvedValue({ success: false, error: 'Gagal' })
    const builder = usePackageBuilder(id)
    await builder.load()
    await builder.remove('q1')
    expect(builder.error.value).toBe('Gagal')

    id.value = 'p2'
    await nextTick()

    expect(builder.error.value).toBeNull()
  })

  it('says whether a removal went through, and refuses while another change runs', async () => {
    const builder = await loaded()
    let release: (value: unknown) => void = () => undefined
    reorder.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const moving = builder.move('q1', 'down')

    expect(await builder.remove('q2')).toBe(false)
    release({ success: true, data: view() })
    await moving
    removeQuestion.mockResolvedValue({ success: true, data: view() })
    expect(await builder.remove('q2')).toBe(true)
  })
})
