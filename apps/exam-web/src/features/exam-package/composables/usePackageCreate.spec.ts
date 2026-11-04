import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useExamBankStore } from '@/features/exam-bank/stores/examBankStore'
import { usePackageCreate } from './usePackageCreate'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { create },
}))

const pair = (subjectId: string, gradeId: string) => ({
  subjectId,
  subjectName: subjectId === 'math' ? 'Matematika' : 'IPA',
  gradeId,
  gradeLevel: gradeId === 'g7' ? 7 : 8,
  gradeName: null,
})

function seed(pairs: ReturnType<typeof pair>[], all = false) {
  const store = useExamBankStore()
  store.scope = { all, employeeId: 'e1', pairs }
}

describe('usePackageCreate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('names what is missing, in order', () => {
    seed([pair('math', 'g7'), pair('math', 'g8'), pair('ipa', 'g8')])
    const form = usePackageCreate()

    expect(form.problem.value).toBe('Judul wajib diisi')
    form.title.value = 'UAS'
    expect(form.problem.value).toBe('Pilih mapel')
    form.subjectId.value = 'math'
    expect(form.problem.value).toBe('Pilih tingkat')
    form.gradeId.value = 'g7'
    expect(form.problem.value).toBeNull()
  })

  it('preselects the only subject and grade a teacher has', () => {
    seed([pair('math', 'g7')])
    const form = usePackageCreate()

    expect(form.subjectId.value).toBe('math')
    expect(form.gradeId.value).toBe('g7')
  })

  it('limits the grades to the chosen subject and clears one that no longer fits', () => {
    seed([pair('math', 'g7'), pair('math', 'g8'), pair('ipa', 'g8')])
    const form = usePackageCreate()

    form.subjectId.value = 'math'
    expect(form.gradeOptions.value.map((option) => option.id)).toEqual([
      'g7',
      'g8',
    ])
    form.gradeId.value = 'g7'
    form.subjectId.value = 'ipa'

    expect(form.gradeOptions.value.map((option) => option.id)).toEqual(['g8'])
    expect(form.gradeId.value).toBe('g8')
  })

  it('creates the package and returns its id', async () => {
    seed([pair('math', 'g7')])
    create.mockResolvedValue({ success: true, data: { id: 'p9' } })
    const form = usePackageCreate()
    form.title.value = '  UAS Matematika  '

    expect(await form.submit()).toBe('p9')
    expect(create).toHaveBeenCalledWith({
      title: 'UAS Matematika',
      subjectId: 'math',
      gradeId: 'g7',
    })
  })

  it('keeps the server message and returns nothing when it is refused', async () => {
    seed([pair('math', 'g7')])
    create.mockResolvedValue({
      success: false,
      error: 'Mapel bukan ampuan Anda',
    })
    const form = usePackageCreate()
    form.title.value = 'UAS'

    expect(await form.submit()).toBeNull()
    expect(form.error.value).toBe('Mapel bukan ampuan Anda')
    expect(form.saving.value).toBe(false)
  })

  it('does not call the server while something is missing', async () => {
    seed([pair('math', 'g7')])
    const form = usePackageCreate()

    expect(await form.submit()).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })
})
