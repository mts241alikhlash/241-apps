// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TooltipProvider } from '@mts241alikhlash/ui/tooltip'
import {
  cardRow,
  chooseRowAction,
  menuLabels,
  nextCardPage,
  openRowMenu,
} from '@/test/dataTableCards'
import EnrollmentListView from './EnrollmentListView.vue'

const service = vi.hoisted(() => ({
  fetchQueue: vi.fn(),
  previewNis: vi.fn(),
  composeNis: vi.fn(),
  lockNis: vi.fn(),
  process: vi.fn(),
  setPlacement: vi.fn(),
}))
vi.mock('../services/enrollmentService', () => ({ enrollmentService: service }))
const publicService = vi.hoisted(() => ({ fetchGrades: vi.fn() }))
vi.mock('../services/publicAdmissionService', () => ({
  publicAdmissionService: publicService,
}))
vi.mock('../services/applicationService', () => ({
  applicationService: { fetchWaves: vi.fn() },
}))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const passthrough = { template: '<div><slot /></div>' }
const selectStubs = {
  Select: {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><slot /></select>',
  },
  SelectTrigger: { template: '<span />' },
  SelectValue: { template: '<span />' },
  SelectContent: { template: '<slot />' },
  SelectItem: {
    props: ['value'],
    template: '<option :value="value"><slot /></option>',
  },
}

const row = (
  id: string,
  name: string,
  overrides: Record<string, unknown> = {},
) => ({
  applicationId: id,
  registrationNumber: `PSB-${id}`,
  applicantName: name,
  waveName: 'Gelombang 1',
  academicYearId: 'y1',
  status: 'ACCEPTED',
  admissionType: 'NEW',
  targetGradeLevel: 7,
  nis: '262707001',
  nisn: '0091234567',
  enrolledStudentId: null,
  ...overrides,
})

const YEARS: {
  academicYearId: string
  academicYearName: string | null
  locked: boolean
  lockedAt: string | null
}[] = [
  {
    academicYearId: 'y1',
    academicYearName: '2026/2027',
    locked: false,
    lockedAt: null,
  },
]
const COUNTS = { ready: 2, held: 1, done: 3 }

function page(rows: unknown[], years = YEARS, counts = COUNTS) {
  return { rows, total: rows.length, counts, years }
}

function mountView() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(EnrollmentListView)),
    }),
    {
      attachTo: document.body,
      global: {
        stubs: {
          Dialog: passthrough,
          DialogContent: passthrough,
          DialogHeader: passthrough,
          DialogTitle: passthrough,
          DialogDescription: passthrough,
          DialogFooter: passthrough,
          ...selectStubs,
        },
      },
    },
  ).findComponent(EnrollmentListView)
}

const tab = (wrapper: ReturnType<typeof mountView>, label: string) =>
  wrapper.findAll('[role="tab"]').find((t) => t.text().includes(label))!
const rowOf = (wrapper: ReturnType<typeof mountView>, index = 0) =>
  cardRow(wrapper, index)
const buttonOf = (parent: Pick<VueWrapper, 'findAll'>, text: string) =>
  parent.findAll('button').find((b) => b.text() === text)!

const PREVIEW = {
  academicYearId: 'y1',
  academicYearName: '2026/2027',
  locked: false,
  changes: 2,
  created: 3,
  rows: [
    {
      applicationId: 'a1',
      applicantName: 'Ahmad Fauzi',
      registrationNumber: 'PSB-a1',
      gradeLevel: 7,
      previous: '262707009',
      nis: '262707001',
      changed: true,
    },
  ],
  skipped: [
    {
      applicationId: 'z',
      applicantName: 'Zaki',
      registrationNumber: 'PSB-z',
      reason: 'Tingkat kelas belum diisi',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  access.granted = new Set([
    'admission-enrollments.read',
    'admission-enrollments.process',
    'admission-enrollments.nis',
  ])
  service.fetchQueue.mockResolvedValue(
    page([row('a1', 'Ahmad Fauzi'), row('a2', 'Siti Aminah')]),
  )
  service.previewNis.mockResolvedValue({ preview: PREVIEW })
  service.composeNis.mockResolvedValue({
    success: true,
    result: {
      academicYearId: 'y1',
      written: 5,
      created: 3,
      changed: 2,
      failed: [],
    },
  })
  service.lockNis.mockResolvedValue({ success: true })
  service.process.mockResolvedValue({
    success: true,
    enrolled: 2,
    problems: [],
  })
  service.setPlacement.mockResolvedValue({ success: true })
  publicService.fetchGrades.mockResolvedValue([
    { id: 'g7', level: 7, name: 'Kelas 7' },
    { id: 'g8', level: 8, name: 'Kelas 8' },
  ])
})

it('shows Siap diproses first with the counts and each applicant’s data', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenCalledWith(
    expect.objectContaining({ tab: 'ready', page: 1, limit: 10 }),
  )
  expect(tab(wrapper, 'Siap diproses').text()).toContain('2')
  expect(tab(wrapper, 'Tertahan').text()).toContain('1')
  expect(tab(wrapper, 'Selesai').text()).toContain('3')
  const first = rowOf(wrapper)
  expect(first.text()).toContain('Ahmad Fauzi')
  expect(first.text()).toContain('Siswa baru')
  expect(first.text()).toContain('Kelas 7')
  expect(first.text()).toContain('262707001')
})

it('has no add button', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(
    wrapper.findAll('button').filter((button) => button.text() === 'Tambah'),
  ).toHaveLength(0)
})

it('marks an applicant without placement or NIS', async () => {
  service.fetchQueue.mockResolvedValue(
    page([
      row('a3', 'Budi', {
        admissionType: null,
        targetGradeLevel: null,
        nis: null,
      }),
    ]),
  )
  const wrapper = mountView()
  await flushPromises()

  expect(rowOf(wrapper).text()).toContain('Jenis:-')
  expect(rowOf(wrapper).text()).toContain('Kelas:-')
  expect(rowOf(wrapper).text()).toContain('NIS:-')
})

it('lets TU type a missing NISN and sends it when processing', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a1', 'Ahmad Fauzi', { nisn: null })]),
  )
  const wrapper = mountView()
  await flushPromises()

  await rowOf(wrapper)
    .get('input[data-test="nisn-input"]')
    .setValue('0099999999')
  await rowOf(wrapper).get('[role="checkbox"]').trigger('click')
  await buttonOf(
    wrapper.get('[data-test="selection-bar"]'),
    'Proses jadi santri',
  ).trigger('click')
  await wrapper.get('[data-test="process-form"]').trigger('submit')
  await flushPromises()

  expect(service.process).toHaveBeenCalledWith(
    ['a1'],
    [{ applicationId: 'a1', nisn: '0099999999' }],
  )
})

it('does not offer an input for a NISN that is already filled', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(rowOf(wrapper).find('input[data-test="nisn-input"]').exists()).toBe(
    false,
  )
  expect(rowOf(wrapper).text()).toContain('0091234567')
})

it('processes the selected applicants after a confirmation with the count', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="select-all"] [role="checkbox"]')
    .trigger('click')
  expect(wrapper.get('[data-test="selection-bar"]').text()).toContain(
    '2 dipilih',
  )
  await buttonOf(
    wrapper.get('[data-test="selection-bar"]'),
    'Proses jadi santri',
  ).trigger('click')
  expect(wrapper.get('[data-test="process-form"]').text()).toContain(
    '2 pendaftar',
  )
  await wrapper.get('[data-test="process-form"]').trigger('submit')
  await flushPromises()

  expect(service.process).toHaveBeenCalledWith(['a1', 'a2'], [])
  expect(service.fetchQueue).toHaveBeenCalledTimes(2)
  expect(wrapper.find('[data-test="selection-bar"]').exists()).toBe(false)
})

it('lists the skipped and failed applicants with their reason', async () => {
  service.process.mockResolvedValue({
    success: true,
    enrolled: 1,
    problems: [
      { applicationId: 'a2', outcome: 'SKIPPED', reason: 'NIS belum disusun' },
      {
        applicationId: 'zz',
        outcome: 'FAILED',
        reason: 'Duplicate NIS or NISN',
      },
    ],
  })
  const wrapper = mountView()
  await flushPromises()
  await wrapper
    .get('[data-test="select-all"] [role="checkbox"]')
    .trigger('click')
  await buttonOf(
    wrapper.get('[data-test="selection-bar"]'),
    'Proses jadi santri',
  ).trigger('click')
  await wrapper.get('[data-test="process-form"]').trigger('submit')
  await flushPromises()

  const result = wrapper.get('[data-test="process-result"]')
  expect(result.text()).toContain('1 diproses, 2 bermasalah')
  expect(result.text()).toContain('Siti Aminah')
  expect(result.text()).toContain('NIS belum disusun')
  expect(result.text()).toContain('Duplicate NIS or NISN')
})

it('sets the missing placement of an applicant', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a3', 'Budi', { admissionType: null, targetGradeLevel: null })]),
  )
  const wrapper = mountView()
  await flushPromises()

  await chooseRowAction(rowOf(wrapper), 'Atur jenis dan kelas')
  const selects = wrapper.get('[data-test="placement-form"]').findAll('select')
  await selects[0].setValue('TRANSFER')
  await selects[1].setValue('g8')
  await wrapper.get('[data-test="placement-form"]').trigger('submit')
  await flushPromises()

  expect(service.setPlacement).toHaveBeenCalledWith('a3', 'TRANSFER', 'g8')
  expect(service.fetchQueue).toHaveBeenCalledTimes(2)
})

it('previews the NIS and confirms the exact count of changes', async () => {
  const wrapper = mountView()
  await flushPromises()

  await buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Susun NIS').trigger(
    'click',
  )
  await flushPromises()

  expect(service.previewNis).toHaveBeenCalledWith('y1')
  const dialog = wrapper.get('[data-test="nis-dialog"]')
  expect(dialog.text()).toContain('2 NIS berubah')
  expect(dialog.text()).toContain('3 NIS baru')
  expect(dialog.text()).toContain('Zaki')
  expect(dialog.text()).toContain('Tingkat kelas belum diisi')

  await buttonOf(dialog, 'Susun').trigger('click')
  await flushPromises()

  expect(service.composeNis).toHaveBeenCalledWith('y1', 2, false)
  expect(service.fetchQueue).toHaveBeenCalledTimes(2)
})

it('reloads the preview when the numbers changed in between', async () => {
  service.composeNis.mockResolvedValue({ success: false, stale: true })
  const wrapper = mountView()
  await flushPromises()
  await buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Susun NIS').trigger(
    'click',
  )
  await flushPromises()

  await buttonOf(wrapper.get('[data-test="nis-dialog"]'), 'Susun').trigger(
    'click',
  )
  await flushPromises()

  expect(service.previewNis).toHaveBeenCalledTimes(2)
  expect(wrapper.find('[data-test="nis-dialog"]').exists()).toBe(true)
})

it('offers a sync after students could not be updated', async () => {
  service.composeNis.mockResolvedValueOnce({
    success: true,
    result: {
      academicYearId: 'y1',
      written: 1,
      created: 0,
      changed: 1,
      failed: [
        { applicationId: 'a1', reason: 'Gagal memperbarui NIS di data santri' },
      ],
    },
  })
  const wrapper = mountView()
  await flushPromises()
  await buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Susun NIS').trigger(
    'click',
  )
  await flushPromises()
  await buttonOf(wrapper.get('[data-test="nis-dialog"]'), 'Susun').trigger(
    'click',
  )
  await flushPromises()

  expect(wrapper.get('[data-test="nis-panel"]').text()).toContain(
    '1 santri belum diperbarui',
  )
  await buttonOf(
    wrapper.get('[data-test="nis-panel"]'),
    'Sinkronkan ulang',
  ).trigger('click')
  await flushPromises()

  expect(service.composeNis).toHaveBeenLastCalledWith('y1', 0, true)
})

it('locks a year after a confirmation and then hides the compose controls', async () => {
  const wrapper = mountView()
  await flushPromises()

  await buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Kunci NIS').trigger(
    'click',
  )
  await buttonOf(wrapper.get('[data-test="lock-dialog"]'), 'Kunci').trigger(
    'click',
  )
  await flushPromises()
  expect(service.lockNis).toHaveBeenCalledWith('y1')

  service.fetchQueue.mockResolvedValue(
    page(
      [row('a1', 'Ahmad Fauzi')],
      [{ ...YEARS[0], locked: true, lockedAt: '2026-10-08T00:00:00.000Z' }],
    ),
  )
  const locked = mountView()
  await flushPromises()
  expect(locked.get('[data-test="nis-panel"]').text()).toContain('NIS dikunci')
  expect(
    buttonOf(locked.get('[data-test="nis-panel"]'), 'Kunci NIS'),
  ).toBeUndefined()
})

it('shows the queue and nothing else without process and nis permissions', async () => {
  access.granted = new Set(['admission-enrollments.read'])
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(0)
  expect(wrapper.find('[data-test="nis-panel"]').exists()).toBe(false)
  expect(rowOf(wrapper).findAll('[role="checkbox"]')).toHaveLength(0)
  await openRowMenu(rowOf(wrapper))
  expect(menuLabels()).toEqual(['Lihat detail'])
  expect(rowOf(wrapper).text()).toContain('Ahmad Fauzi')
})

it('holds the applicants that failed in Tertahan and lets them be processed again', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a5', 'Eko', { status: 'ENROLLING' })]),
  )
  const wrapper = mountView()
  await flushPromises()
  await tab(wrapper, 'Tertahan').trigger('mousedown')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ tab: 'held' }),
  )
  expect(rowOf(wrapper).find('[role="checkbox"]').exists()).toBe(true)
})

it('shows no checkbox for students already enrolled', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a6', 'Fajar', { status: 'ENROLLED', enrolledStudentId: 's1' })]),
  )
  const wrapper = mountView()
  await flushPromises()
  await tab(wrapper, 'Selesai').trigger('mousedown')
  await flushPromises()

  expect(rowOf(wrapper).find('[role="checkbox"]').exists()).toBe(false)
})

it('shows the load error with a retry', async () => {
  service.fetchQueue.mockResolvedValue({
    error: 'Gagal memuat antrean daftar ulang.',
  })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.text()).toContain('Gagal memuat antrean daftar ulang.')
  service.fetchQueue.mockResolvedValue(page([]))
  await buttonOf(wrapper, 'Coba lagi').trigger('click')
  await flushPromises()

  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('does not let more than 50 applicants be processed in one run', async () => {
  const many = Array.from({ length: 51 }, (_, index) =>
    row(`m${index}`, `Santri ${index}`),
  )
  service.fetchQueue.mockResolvedValue(page(many))
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="select-all"] [role="checkbox"]')
    .trigger('click')

  const bar = wrapper.get('[data-test="selection-bar"]')
  expect(bar.text()).toContain('Maksimal 50 pendaftar sekali proses')
  expect(
    buttonOf(bar, 'Proses jadi santri').attributes('disabled'),
  ).toBeDefined()
}, 20000)

it('rejects a typed NISN that is not 10 digits', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a1', 'Ahmad Fauzi', { nisn: null })]),
  )
  const wrapper = mountView()
  await flushPromises()

  await rowOf(wrapper).get('input[data-test="nisn-input"]').setValue('12345')
  await rowOf(wrapper).get('[role="checkbox"]').trigger('click')
  await buttonOf(
    wrapper.get('[data-test="selection-bar"]'),
    'Proses jadi santri',
  ).trigger('click')
  await wrapper.get('[data-test="process-form"]').trigger('submit')
  await flushPromises()

  expect(service.process).not.toHaveBeenCalled()
  expect(wrapper.get('[data-test="process-form"]').text()).toContain(
    'NISN harus 10 digit angka',
  )
})

it('lists every number in the NIS preview, new ones included', async () => {
  service.previewNis.mockResolvedValue({
    preview: {
      ...PREVIEW,
      rows: [
        {
          applicationId: 'n1',
          applicantName: 'Budi Baru',
          registrationNumber: 'PSB-n1',
          gradeLevel: 7,
          previous: null,
          nis: '262707002',
          changed: false,
        },
      ],
    },
  })
  const wrapper = mountView()
  await flushPromises()
  await buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Susun NIS').trigger(
    'click',
  )
  await flushPromises()

  const dialog = wrapper.get('[data-test="nis-dialog"]')
  expect(dialog.text()).toContain('Budi Baru')
  expect(dialog.text()).toContain('262707002')
})

it('keeps the sync button available after a reload', async () => {
  const wrapper = mountView()
  await flushPromises()

  await buttonOf(
    wrapper.get('[data-test="nis-panel"]'),
    'Sinkronkan ulang',
  ).trigger('click')
  await flushPromises()

  expect(service.composeNis).toHaveBeenLastCalledWith('y1', 0, true)
})

it('offers no sync while nobody has been enrolled yet', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a1', 'Ahmad Fauzi')], YEARS, { ready: 1, held: 0, done: 0 }),
  )
  const wrapper = mountView()
  await flushPromises()

  expect(
    buttonOf(wrapper.get('[data-test="nis-panel"]'), 'Sinkronkan ulang'),
  ).toBeUndefined()
})

it('draws the row checkbox at the left of each card', async () => {
  const wrapper = mountView()
  await flushPromises()

  const first = rowOf(wrapper).element.firstElementChild!
  expect(first.querySelector('[role="checkbox"]')).not.toBeNull()
})

it('offers no placement button on a held applicant', async () => {
  service.fetchQueue.mockResolvedValue(
    page([row('a5', 'Eko', { status: 'ENROLLING' })]),
  )
  const wrapper = mountView()
  await flushPromises()

  await openRowMenu(rowOf(wrapper))
  expect(menuLabels()).not.toContain('Atur jenis dan kelas')
})

it('renders DataTable with expected columns and without numbering column', async () => {
  const wrapper = mountView()
  await flushPromises()

  const dataTable = wrapper.findComponent({ name: 'DataTable' })
  expect(dataTable.exists()).toBe(true)
  const columns = dataTable.props('columns') as { header?: unknown }[]
  const headers = columns.map((c) =>
    typeof c.header === 'string' ? c.header : undefined,
  )
  expect(headers).not.toContain('No')
  expect(headers.filter(Boolean)).toEqual([
    'No. Pendaftaran',
    'Nama Pendaftar',
    'NIS',
    'NISN',
    'Gelombang',
    'Jenis',
    'Kelas',
    'Status',
    'Aksi',
  ])
})

it('loads the next page from the server and replaces the rows', async () => {
  service.fetchQueue.mockResolvedValue({
    ...page([row('a1', 'Ahmad Fauzi')], YEARS, COUNTS),
    total: 25,
  })
  const wrapper = mountView()
  await flushPromises()
  service.fetchQueue.mockResolvedValue({
    ...page([row('a2', 'Siti Aminah')], YEARS, COUNTS),
    total: 25,
  })

  await nextCardPage(wrapper).trigger('click')
  await flushPromises()

  expect(service.fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ tab: 'ready', page: 2, limit: 10 }),
  )
  expect(wrapper.text()).toContain('Siti Aminah')
  expect(wrapper.text()).not.toContain('Ahmad Fauzi')
})
