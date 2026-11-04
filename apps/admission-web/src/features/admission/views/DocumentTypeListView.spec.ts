// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DocumentTypeListView from './DocumentTypeListView.vue'
import DocumentTypeFormDialog from '../components/DocumentTypeFormDialog.vue'
import { cardRows, rowActionProps } from '@/test/dataTableCards'

const service = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  save: vi.fn(),
  reorder: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../services/documentTypeService', () => ({
  documentTypeService: service,
}))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

const ALL = [
  'admission-document-types.create',
  'admission-document-types.update',
  'admission-document-types.delete',
]

const passthrough = { template: '<div><slot /></div>' }
const types = [
  {
    id: 't1',
    code: 'FAMILY_CARD',
    name: 'Kartu Keluarga',
    isRequired: true,
    requirement: 'REQUIRED',
    lateDueMonths: null,
    isActive: true,
    sortOrder: 1,
    documentCount: 4,
  },
  {
    id: 't2',
    code: 'PHOTO',
    name: 'Pas Foto',
    isRequired: true,
    requirement: 'REQUIRED',
    lateDueMonths: null,
    isActive: true,
    sortOrder: 2,
    documentCount: 0,
  },
  {
    id: 't3',
    code: 'REPORT_CARD',
    name: 'Rapor',
    isRequired: false,
    requirement: 'OPTIONAL',
    lateDueMonths: null,
    isActive: false,
    sortOrder: 3,
    documentCount: 0,
  },
]

type Row = (typeof types)[number]

beforeEach(() => {
  vi.clearAllMocks()
  access.granted = new Set(ALL)
})

function mountView() {
  return mount(DocumentTypeListView, {
    global: {
      stubs: {
        Tooltip: passthrough,
        TooltipTrigger: passthrough,
        TooltipContent: passthrough,
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        AlertDialog: passthrough,
        AlertDialogContent: passthrough,
        AlertDialogHeader: passthrough,
        AlertDialogTitle: passthrough,
        AlertDialogDescription: passthrough,
        AlertDialogFooter: passthrough,
        AlertDialogCancel: { template: '<button><slot /></button>' },
        AlertDialogAction: { template: '<button><slot /></button>' },
      },
    },
  })
}

it('adds a type and reloads the list', async () => {
  service.fetchAll.mockResolvedValue({ types: [] })
  service.save.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')
  await wrapper.get('input[name="name"]').setValue('Surat Keterangan Sehat')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await vi.waitFor(() => expect(service.save).toHaveBeenCalled())

  expect(service.save).toHaveBeenCalledWith(null, {
    name: 'Surat Keterangan Sehat',
    requirement: 'REQUIRED',
    lateDueMonths: null,
    isActive: true,
  })
  expect(service.fetchAll).toHaveBeenCalledTimes(2)
})

it('offers delete only for an unused type', async () => {
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  expect(rowActionProps<Row>(wrapper, types[0]).hideDelete).toBe(true)
  expect(rowActionProps<Row>(wrapper, types[1]).hideDelete).toBe(false)
  const items = cardRows(wrapper)
  expect(items).toHaveLength(3)
  expect(items[2].text()).toContain('Nonaktif')
  expect(items[2].text()).toContain('Opsional')
})

it('refuses a blank name and shows the reason', async () => {
  service.fetchAll.mockResolvedValue({ types: [] })
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')
  await wrapper.get('input[name="name"]').setValue('   ')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  await vi.waitFor(() =>
    expect(wrapper.text()).toContain('Nama jenis berkas wajib diisi'),
  )
  expect(service.save).not.toHaveBeenCalled()
})

it('suggests deactivating when editing a type that has uploads', async () => {
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  rowActionProps<Row>(wrapper, types[0]).onEdit()
  await flushPromises()

  expect(wrapper.text()).toContain('Sudah diunggah 4 kali')
})

it('offers nothing to change without create, update or delete rights', async () => {
  access.granted = new Set()
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  expect(cardRows(wrapper)).toHaveLength(3)
  expect(
    wrapper.findAll('button').filter((b) => b.text().includes('Tambah')),
  ).toHaveLength(0)
  for (const type of types) {
    const props = rowActionProps<Row>(wrapper, type)
    expect(props.hideEdit).toBe(true)
    expect(props.hideDelete).toBe(true)
  }
})

it('lets a user who may only update edit but not delete', async () => {
  access.granted = new Set(['admission-document-types.update'])
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  const props = rowActionProps<Row>(wrapper, types[1])
  expect(props.hideEdit).toBe(false)
  expect(props.hideDelete).toBe(true)
})

const headersOf = (wrapper: ReturnType<typeof mountView>) =>
  (
    wrapper.getComponent({ name: 'DataTable' }).props('columns') as {
      header?: unknown
    }[]
  )
    .map((column) => column.header)
    .filter((header) => typeof header === 'string')

it('has no reorder controls', async () => {
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.find('button[aria-label^="Naikkan"]').exists()).toBe(false)
  expect(wrapper.find('button[aria-label^="Turunkan"]').exists()).toBe(false)
  expect(headersOf(wrapper)).not.toContain('Urutan')
})

it('shows name and code in separate columns with a clear header for the upload requirement', async () => {
  service.fetchAll.mockResolvedValue({ types })
  const wrapper = mountView()
  await flushPromises()

  expect(headersOf(wrapper)).toEqual([
    'Nama',
    'Kode',
    'Kewajiban',
    'Status',
    'Aksi',
  ])
  const cells = wrapper.findAll('tbody tr')[0].findAll('td')
  expect(cells[0].text()).toBe('Kartu Keluarga')
  expect(cells[1].text()).toBe('FAMILY_CARD')
})

it('shows the requirement badge and the limit for Susulan', async () => {
  service.fetchAll.mockResolvedValue({
    types: [
      {
        ...types[0],
        id: 't4',
        name: 'Ijazah SD',
        requirement: 'LATER',
        lateDueMonths: 3,
      },
    ],
  })
  const wrapper = mountView()
  await flushPromises()

  expect(cardRows(wrapper)[0].text()).toContain('Susulan · 3 bln')
})

it('shows the limit field only for Susulan', async () => {
  service.fetchAll.mockResolvedValue({ types: [] })
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')
  expect(wrapper.find('input[name="lateDueMonths"]').exists()).toBe(false)

  const dialog = wrapper.findComponent(DocumentTypeFormDialog)
  const select = dialog
    .findAllComponents({ name: 'Select' })
    .find((c) => c.props('modelValue') === 'REQUIRED')!
  await select.setValue('LATER')
  await flushPromises()
  expect(wrapper.find('input[name="lateDueMonths"]').exists()).toBe(true)
})

it('saves requirement and limit', async () => {
  service.fetchAll.mockResolvedValue({ types: [] })
  service.save.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')
  await wrapper.get('input[name="name"]').setValue('Ijazah SD')
  const select = wrapper
    .findComponent(DocumentTypeFormDialog)
    .findAllComponents({ name: 'Select' })
    .find((c) => c.props('modelValue') === 'REQUIRED')!
  await select.setValue('LATER')
  await flushPromises()
  await wrapper.get('input[name="lateDueMonths"]').setValue('3')
  await wrapper.get('form').trigger('submit')
  await vi.waitFor(() => expect(service.save).toHaveBeenCalled())

  expect(service.save).toHaveBeenCalledWith(null, {
    name: 'Ijazah SD',
    requirement: 'LATER',
    lateDueMonths: 3,
    isActive: true,
  })
})
