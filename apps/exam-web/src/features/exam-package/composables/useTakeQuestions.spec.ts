import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { useTakeQuestions } from './useTakeQuestions'

const { loadApprovedSources, loadPackage, take } = vi.hoisted(() => ({
  loadApprovedSources: vi.fn(),
  loadPackage: vi.fn(),
  take: vi.fn(),
}))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadApprovedSources, loadPackage, take },
}))

const target = { packageId: 'p1', subjectId: 'math', gradeId: 'g7' }

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    questionId: `q${index + 1}`,
    questionVersion: 1,
    position: index + 1,
    type: 'TRUE_FALSE' as const,
    marker: 'NEW' as const,
    summary: `Soal ${index + 1}`,
    points: 2,
  }))

describe('useTakeQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadApprovedSources.mockResolvedValue([
      { id: 'p1', title: 'Paket ini' },
      { id: 'p2', title: 'Bank UAS' },
    ])
    loadPackage.mockResolvedValue({ id: 'p2', items: items(4) })
  })

  it('offers the approved and scheduled packages of the subject and grade, without the target', async () => {
    const take$ = useTakeQuestions(target)
    await take$.load()

    expect(loadApprovedSources).toHaveBeenCalledWith('math', 'g7')
    expect(take$.sources.value.map((row) => row.id)).toEqual(['p2'])
  })

  it('loads the questions of the chosen source and clears the selection', async () => {
    const take$ = useTakeQuestions(target)
    await take$.load()
    take$.sourceId.value = 'p2'
    await flushPromises()

    expect(loadPackage).toHaveBeenCalledWith('p2')
    expect(take$.questions.value).toHaveLength(4)
    take$.toggle('q1')
    take$.sourceId.value = ''
    await flushPromises()
    expect(take$.selected.value.size).toBe(0)
    expect(take$.questions.value).toEqual([])
  })

  it('toggles one question, selects all and clears', async () => {
    const take$ = useTakeQuestions(target)
    await take$.load()
    take$.sourceId.value = 'p2'
    await flushPromises()

    take$.toggle('q2')
    expect([...take$.selected.value]).toEqual(['q2'])
    take$.toggle('q2')
    expect(take$.selected.value.size).toBe(0)
    take$.selectAll()
    expect(take$.selected.value.size).toBe(4)
    take$.clear()
    expect(take$.selected.value.size).toBe(0)
  })

  it('sends the chosen questions in the order of the source and reports success', async () => {
    take.mockResolvedValue({ success: true, data: { id: 'p1' } })
    const take$ = useTakeQuestions(target)
    await take$.load()
    take$.sourceId.value = 'p2'
    await flushPromises()
    take$.toggle('q3')
    take$.toggle('q1')

    expect(await take$.submit()).toBe(true)
    expect(take).toHaveBeenCalledWith('p1', {
      sourcePackageId: 'p2',
      questionIds: ['q1', 'q3'],
    })
  })

  it('keeps the server message when the take is refused', async () => {
    take.mockResolvedValue({
      success: false,
      error: 'Paket asal harus memiliki mapel dan tingkat yang sama',
    })
    const take$ = useTakeQuestions(target)
    await take$.load()
    take$.sourceId.value = 'p2'
    await flushPromises()
    take$.selectAll()

    expect(await take$.submit()).toBe(false)
    expect(take$.error.value).toContain('mapel dan tingkat yang sama')
    expect(take$.saving.value).toBe(false)
  })

  it('sends nothing when nothing is chosen', async () => {
    const take$ = useTakeQuestions(target)
    await take$.load()

    expect(await take$.submit()).toBe(false)
    expect(take).not.toHaveBeenCalled()
  })

  it('handles a source of 200 questions and refuses more than the server accepts', async () => {
    loadPackage.mockResolvedValue({ id: 'p2', items: items(201) })
    const take$ = useTakeQuestions(target)
    await take$.load()
    take$.sourceId.value = 'p2'
    await flushPromises()
    take$.selectAll()

    expect(take$.selected.value.size).toBe(201)
    expect(await take$.submit()).toBe(false)
    expect(take$.error.value).toBe('Paling banyak 200 soal sekali salin')
    expect(take).not.toHaveBeenCalled()
  })

  it('tells the user instead of throwing when the source cannot be loaded', async () => {
    loadPackage.mockRejectedValue(new Error('down'))
    const take$ = useTakeQuestions(target)
    await take$.load()

    take$.sourceId.value = 'p2'
    await flushPromises()

    expect(take$.error.value).toBe('Soal paket ini tidak dapat dimuat.')
    expect(take$.questions.value).toEqual([])
  })
})
