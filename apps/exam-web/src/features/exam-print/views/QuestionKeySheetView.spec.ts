// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import QuestionKeySheetView from './QuestionKeySheetView.vue'

const {
  push,
  route,
  loadEvents,
  loadTargets,
  loadSheets,
  preloadSheetImages,
  waitForPrintImages,
} = vi.hoisted(() => {
  const params: Record<string, string> = {}
  return {
    push: vi.fn(),
    route: { params },
    loadEvents: vi.fn(),
    loadTargets: vi.fn(),
    loadSheets: vi.fn(),
    preloadSheetImages: vi.fn(),
    waitForPrintImages: vi.fn(),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => reactive(route),
  useRouter: () => ({ push }),
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: vi.fn(),
}))
vi.mock('@/features/exam-event/services/examEventService', () => ({
  examEventService: { loadEvents },
}))
vi.mock('../services/questionKeySheetService', () => ({
  questionKeySheetService: {
    loadTargets,
    loadSheets,
    preloadSheetImages,
  },
}))
vi.mock('../printImages', () => ({
  waitForPrintImages,
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({
  props: { disabled: Boolean, variant: String },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const backButtonStub = defineComponent({
  props: { label: String },
  emits: ['click'],
  template:
    '<button type="button" data-test="back" @click="$emit(\'click\')">{{ label }}</button>',
})
const dataTableStub = defineComponent({
  props: {
    columns: Array,
    data: Array,
    itemLabel: String,
    isLoading: Boolean,
  },
  template:
    '<div data-test="table" :data-item-label="itemLabel"><div v-for="(row, index) in data" :key="index" class="row"><template v-for="col in columns" :key="col.id">{{ typeof col.cell === "function" && typeof col.cell({ row: { original: row } }) === "string" ? col.cell({ row: { original: row } }) : "" }}</template><button type="button" class="row-manage" @click="columns[columns.length - 1].cell({ row: { original: row } }).props.onManage()" /><button type="button" class="row-print" @click="columns[columns.length - 1].cell({ row: { original: row } }).props.items[0].onClick()" /></div><slot name="empty" /></div>',
})
const dialogStub = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open" data-test="preview-dialog"><slot /></div>',
})

const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
  Button: buttonStub,
  BackButton: backButtonStub,
  DataTable: dataTableStub,
  DataTableEmpty: passthrough,
  SearchInput: passthrough,
  Dialog: dialogStub,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  QuestionKeySheet: defineComponent({
    props: {
      subject: String,
      grade: String,
      packageTitle: String,
      items: Array,
    },
    template:
      '<div data-test="sheet" :data-subject="subject" :data-grade="grade" :data-package="packageTitle" :data-count="items?.length" />',
  }),
}

const sampleEvents = [
  {
    id: 'e1',
    name: 'ASAS Ganjil',
    status: 'ACTIVE',
    startsAt: '2026-11-23T00:00:00.000Z',
    endsAt: '2026-11-27T00:00:00.000Z',
  },
  {
    id: 'e2',
    name: 'ASTS Ganjil',
    status: 'COMPLETED',
    startsAt: '2026-09-21T00:00:00.000Z',
    endsAt: '2026-09-25T00:00:00.000Z',
  },
]

const sampleTargets = [
  {
    activityId: 'a1',
    eventId: 'e1',
    subjectId: 's1',
    subjectName: 'Matematika',
    gradeId: 'g7',
    gradeName: 'Kelas 7',
    packageId: 'p1',
    startsAt: '2026-11-23T01:00:00.000Z',
    endsAt: '2026-11-23T02:30:00.000Z',
  },
  {
    activityId: 'a2',
    eventId: 'e1',
    subjectId: 's1',
    subjectName: 'Matematika',
    gradeId: 'g8',
    gradeName: 'Kelas 8',
    packageId: 'p2',
    startsAt: '2026-11-24T01:00:00.000Z',
    endsAt: '2026-11-24T02:30:00.000Z',
  },
]

const sampleSheet = (target: (typeof sampleTargets)[number]) => ({
  target,
  pkg: {
    id: target.packageId,
    title: `Paket ${target.gradeName}`,
    subjectId: target.subjectId,
    gradeId: target.gradeId,
    status: 'LOCKED' as const,
    lockedAt: null,
    createdById: 'u1',
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
    items: [
      {
        questionId: 'q1',
        questionVersion: 1,
        position: 1,
        type: 'TRUE_FALSE' as const,
        bodyHtml: '<p>Soal</p>',
        content: { answer: { value: true } },
        points: 2,
        resolution: 'NORMAL' as const,
      },
    ],
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  route.params = {}
  loadEvents.mockResolvedValue({
    success: true,
    data: sampleEvents,
  })
  loadTargets.mockResolvedValue(sampleTargets)
  loadSheets.mockImplementation((list: typeof sampleTargets) =>
    Promise.resolve(list.map(sampleSheet)),
  )
  preloadSheetImages.mockResolvedValue(undefined)
  waitForPrintImages.mockResolvedValue(undefined)
  vi.stubGlobal('print', vi.fn())
})

describe('QuestionKeySheetView', () => {
  it('lists exam periods initially and navigates on drill-down', async () => {
    const wrapper = mount(QuestionKeySheetView, { global: { stubs } })
    await flushPromises()

    expect(loadTargets).not.toHaveBeenCalled()
    expect(
      wrapper.get('[data-test="table"]').attributes('data-item-label'),
    ).toBe('periode')
    expect(wrapper.find('[data-test="back"]').exists()).toBe(false)
    expect(wrapper.findAll('.row')).toHaveLength(2)
    expect(wrapper.text()).toContain('ASAS Ganjil')
    expect(wrapper.text()).toContain('ASTS Ganjil')

    await wrapper.findAll('.row-manage')[0].trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'ExamPrintQuestionKeys',
      params: { eventId: 'e1' },
    })
  })

  it('lists grouped subjects for the selected period and navigates to grades', async () => {
    route.params = { eventId: 'e1' }
    const wrapper = mount(QuestionKeySheetView, { global: { stubs } })
    await flushPromises()

    expect(loadTargets).toHaveBeenCalledWith('e1')
    expect(
      wrapper.get('[data-test="table"]').attributes('data-item-label'),
    ).toBe('mata pelajaran')
    expect(wrapper.get('[data-test="back"]').text()).toBe(
      'Kembali ke daftar periode',
    )
    expect(wrapper.findAll('.row')).toHaveLength(1)
    expect(wrapper.text()).toContain('Matematika')

    await wrapper.get('.row-manage').trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'ExamPrintQuestionKeys',
      params: { eventId: 'e1', subjectId: 's1' },
    })
  })

  it('lists grades for the selected subject and opens the preview dialog', async () => {
    route.params = { eventId: 'e1', subjectId: 's1' }
    const wrapper = mount(QuestionKeySheetView, { global: { stubs } })
    await flushPromises()

    expect(
      wrapper.get('[data-test="table"]').attributes('data-item-label'),
    ).toBe('tingkat')
    expect(wrapper.get('[data-test="back"]').text()).toBe(
      'Kembali ke daftar mata pelajaran',
    )
    expect(wrapper.findAll('.row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Kelas 7')
    expect(wrapper.text()).toContain('Kelas 8')

    await wrapper.findAll('.row-manage')[0].trigger('click')
    await flushPromises()

    const dialog = wrapper.get('[data-test="preview-dialog"]')
    const sheet = dialog.get('[data-test="sheet"]')
    expect(sheet.attributes('data-subject')).toBe('Matematika')
    expect(sheet.attributes('data-grade')).toBe('Kelas 7')
    expect(sheet.attributes('data-count')).toBe('1')

    await wrapper.get('[data-test="back"]').trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'ExamPrintQuestionKeys',
      params: { eventId: 'e1' },
    })
  })

  it('loads targets and sheets then invokes window.print on period print click', async () => {
    const wrapper = mount(QuestionKeySheetView, { global: { stubs } })
    await flushPromises()

    await wrapper.findAll('.row-print')[0].trigger('click')
    await flushPromises()

    expect(loadTargets).toHaveBeenCalledWith('e1')
    expect(loadSheets).toHaveBeenCalledWith(sampleTargets)
    expect(preloadSheetImages).toHaveBeenCalledTimes(1)
    expect(waitForPrintImages).toHaveBeenCalledTimes(1)
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})
