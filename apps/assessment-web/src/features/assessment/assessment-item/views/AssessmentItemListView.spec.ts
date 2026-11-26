// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeachingAssignment } from '@/features/lookup/teaching-assignment/types'
import { rdmService } from '@/features/assessment/rdm/services/rdmService'
import { useAssessmentItemStore } from '../stores/assessmentItemStore'
import { assessmentItemService } from '../services/assessmentItemService'
import AssessmentItemListView from './AssessmentItemListView.vue'

const mockPermissions = vi.hoisted(() => ({ list: [] as string[] }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ meta: { category: 'CLASSWORK' } }),
}))

vi.mock('@mts241alikhlash/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => mockPermissions.list.includes(p)),
  }),
  useAuthSession: () => ({
    hasPermission: (p: string) => mockPermissions.list.includes(p),
  }),
}))

vi.mock('../services/assessmentItemService', () => ({
  assessmentItemService: {
    fetchRelatedData: vi.fn(),
    fetchAssignmentsForSemester: vi.fn(),
    fetchItems: vi.fn(),
    fetchGradingItems: vi.fn(),
    saveItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}))

vi.mock('@/features/assessment/rdm/services/rdmService', () => ({
  extractRdmErrorMessage: vi.fn((_err: unknown, fallback: string) =>
    Promise.resolve(fallback),
  ),
  rdmService: {
    getCandidates: vi.fn(),
    downloadWorkbook: vi.fn(),
    fillTemplate: vi.fn(),
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
  },
}))

const twoAssignments: TeachingAssignment[] = [
  {
    id: 'ta-1',
    employeeId: 'emp-1',
    classroomId: 'cls-1',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
  },
  {
    id: 'ta-2',
    employeeId: 'emp-1',
    classroomId: 'cls-2',
    subjectId: 'sub-1',
    semesterId: 'sem-1',
  },
]

function setupStore(assignments: TeachingAssignment[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAssessmentItemStore()
  store.semesters = [
    {
      id: 'sem-1',
      name: 'Ganjil 2026/2027',
      isActive: true,
      academicYearId: 'ay-1',
      academicYear: { id: 'ay-1', name: '2026/2027' },
    } as never,
  ]
  store.selectedSemesterId = 'sem-1'
  store.classrooms = [
    { id: 'cls-1', code: '7A', name: 'Kelas 7A', gradeId: 'g-7' },
    { id: 'cls-2', code: '7B', name: 'Kelas 7B', gradeId: 'g-7' },
  ]
  store.subjects = [{ id: 'sub-1', name: 'Matematika' }]
  store.assignments = assignments
  return pinia
}

function findButton(label: string) {
  return Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )
}

describe('AssessmentItemListView RDM menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPermissions.list = ['assessment-items.read', 'assessment-items.rdm']
    vi.mocked(assessmentItemService.fetchRelatedData).mockResolvedValue(
      undefined,
    )
    vi.mocked(assessmentItemService.fetchGradingItems).mockResolvedValue(
      undefined,
    )
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('hides the RDM menu without assessment-items.rdm permission', async () => {
    mockPermissions.list = ['assessment-items.read']
    const pinia = setupStore([twoAssignments[0]])
    const wrapper = mount(AssessmentItemListView, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    })
    await flushPromises()

    expect(findButton('RDM')).toBeUndefined()
    wrapper.unmount()
  })

  it('hides the RDM menu when multiple teaching assignments are active', async () => {
    const pinia = setupStore(twoAssignments)
    const wrapper = mount(AssessmentItemListView, {
      global: { plugins: [pinia] },
      attachTo: document.body,
    })
    await flushPromises()

    expect(findButton('RDM')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the RDM menu with the three actions when permission is held and one teaching assignment is selected', async () => {
    const pinia = setupStore([twoAssignments[0]])
    vi.mocked(rdmService.getCandidates).mockResolvedValue({
      sumatif: [],
      sas: [],
    })
    const wrapper = mount(AssessmentItemListView, {
      global: {
        plugins: [pinia],
        stubs: {
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: { template: '<div><slot /></div>' },
          DropdownMenuItem: {
            template:
              '<button type="button" @click="$emit(\'select\'); $emit(\'click\')"><slot /></button>',
          },
          DropdownMenuSub: { template: '<div><slot /></div>' },
          DropdownMenuSubTrigger: { template: '<div><slot /></div>' },
          DropdownMenuSubContent: { template: '<div><slot /></div>' },
        },
      },
      attachTo: document.body,
    })
    await flushPromises()

    expect(findButton('RDM')).toBeDefined()
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toContain('Isi template RDM')
    expect(bodyText).toContain('Unduh template')
    expect(bodyText).toContain('Impor nilai')

    wrapper.unmount()
  })
})
