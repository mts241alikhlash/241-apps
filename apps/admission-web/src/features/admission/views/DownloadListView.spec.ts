// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DownloadListView from './DownloadListView.vue'
import { cardRow, cardRows, rowActionProps } from '@/test/dataTableCards'

const service = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  save: vi.fn(),
  reorder: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../services/downloadService', () => ({ downloadService: service }))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

const ALL = [
  'admission-downloads.create',
  'admission-downloads.update',
  'admission-downloads.delete',
]

const passthrough = { template: '<div><slot /></div>' }
const downloads = [
  {
    id: 'd1',
    title: 'Brosur PPDB',
    description: 'Edisi 2026',
    fileName: 'brosur.pdf',
    sizeBytes: 1572864,
    sortOrder: 1,
    isActive: true,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
  },
  {
    id: 'd2',
    title: 'Formulir Pendaftaran',
    description: null,
    fileName: 'formulir.pdf',
    sizeBytes: 204800,
    sortOrder: 2,
    isActive: false,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
  },
]

type Row = (typeof downloads)[number]

beforeEach(() => {
  vi.clearAllMocks()
  access.granted = new Set(ALL)
})

function mountView() {
  return mount(DownloadListView, {
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

function pdf(name = 'baru.pdf', type = 'application/pdf', size = 100) {
  const file = new File(['%PDF-'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function pick(wrapper: ReturnType<typeof mountView>, file: File) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
}

async function openAdd(wrapper: ReturnType<typeof mountView>) {
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Tambah')!
    .trigger('click')
}

async function submit(wrapper: ReturnType<typeof mountView>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

it('lists the files on mobile with size, status and description', async () => {
  service.fetchAll.mockResolvedValue({ downloads })
  const wrapper = mountView()
  await flushPromises()

  const items = cardRows(wrapper)
  expect(items).toHaveLength(2)
  expect(items[0].text()).toContain('Brosur PPDB')
  expect(items[0].text()).toContain('Edisi 2026')
  expect(items[0].text()).toContain('brosur.pdf')
  expect(items[0].text()).toContain('1,5 MB')
  expect(items[0].text()).toContain('Aktif')
  expect(items[1].text()).toContain('Nonaktif')
  const headers = (
    wrapper.getComponent({ name: 'DataTable' }).props('columns') as {
      header?: unknown
    }[]
  ).map((column) => column.header)
  expect(headers).toEqual(['Urutan', 'Judul', 'Berkas', 'Status', 'Aksi'])
})

it('adds a file with its PDF and reloads the list', async () => {
  service.fetchAll.mockResolvedValue({ downloads: [] })
  service.save.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await openAdd(wrapper)
  await wrapper.get('input[name="title"]').setValue('  Brosur PPDB  ')
  const file = pdf()
  await pick(wrapper, file)
  await submit(wrapper)
  await vi.waitFor(() => expect(service.save).toHaveBeenCalled())

  expect(service.save).toHaveBeenCalledWith(null, {
    title: 'Brosur PPDB',
    description: '',
    isActive: true,
    file,
  })
  expect(service.fetchAll).toHaveBeenCalledTimes(2)
})

it('refuses to add without a file', async () => {
  service.fetchAll.mockResolvedValue({ downloads: [] })
  const wrapper = mountView()
  await flushPromises()

  await openAdd(wrapper)
  await wrapper.get('input[name="title"]').setValue('Brosur')
  await submit(wrapper)

  await vi.waitFor(() => expect(wrapper.text()).toContain('Pilih berkas PDF.'))
  expect(service.save).not.toHaveBeenCalled()
})

it('refuses a blank title', async () => {
  service.fetchAll.mockResolvedValue({ downloads: [] })
  const wrapper = mountView()
  await flushPromises()

  await openAdd(wrapper)
  await wrapper.get('input[name="title"]').setValue('   ')
  await pick(wrapper, pdf())
  await submit(wrapper)

  await vi.waitFor(() =>
    expect(wrapper.text()).toContain('Judul berkas wajib diisi'),
  )
  expect(service.save).not.toHaveBeenCalled()
})

it.each([
  ['a non-PDF', pdf('a.docx', 'application/msword'), 'Berkas harus PDF.'],
  ['an empty file', pdf('a.pdf', 'application/pdf', 0), 'Berkas kosong.'],
  [
    'a file over 5 MB',
    pdf('a.pdf', 'application/pdf', 5 * 1024 * 1024 + 1),
    'Ukuran berkas maksimal 5 MB.',
  ],
])('refuses %s and sends nothing', async (_name, file, message) => {
  service.fetchAll.mockResolvedValue({ downloads: [] })
  const wrapper = mountView()
  await flushPromises()

  await openAdd(wrapper)
  await wrapper.get('input[name="title"]').setValue('Brosur')
  await pick(wrapper, file)
  await submit(wrapper)

  expect(wrapper.text()).toContain(message)
  expect(service.save).not.toHaveBeenCalled()
})

it('edits without a new file and keeps the stored PDF', async () => {
  service.fetchAll.mockResolvedValue({ downloads })
  service.save.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  rowActionProps<Row>(wrapper, downloads[0]).onEdit()
  await flushPromises()
  expect(wrapper.text()).toContain('brosur.pdf')
  expect(
    (wrapper.get('input[name="title"]').element as HTMLInputElement).value,
  ).toBe('Brosur PPDB')

  await wrapper.get('input[name="description"]').setValue('')
  await submit(wrapper)
  await vi.waitFor(() => expect(service.save).toHaveBeenCalled())

  expect(service.save).toHaveBeenCalledWith('d1', {
    title: 'Brosur PPDB',
    description: '',
    isActive: true,
    file: null,
  })
})

it('moves a file down and sends the full order', async () => {
  service.fetchAll.mockResolvedValue({ downloads })
  service.reorder.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await cardRow(wrapper, 0)
    .get('button[aria-label="Turunkan Brosur PPDB"]')
    .trigger('click')
  await flushPromises()

  expect(service.reorder).toHaveBeenCalledWith(['d2', 'd1'])
  expect(service.fetchAll).toHaveBeenCalledTimes(2)
})

it('cannot move the first file up or the last one down', async () => {
  service.fetchAll.mockResolvedValue({ downloads })
  const wrapper = mountView()
  await flushPromises()

  const items = cardRows(wrapper)
  expect(
    items[0]
      .get('button[aria-label="Naikkan Brosur PPDB"]')
      .attributes('disabled'),
  ).toBeDefined()
  expect(
    items[1]
      .get('button[aria-label="Turunkan Formulir Pendaftaran"]')
      .attributes('disabled'),
  ).toBeDefined()
  expect(
    items[0]
      .get('button[aria-label="Turunkan Brosur PPDB"]')
      .attributes('disabled'),
  ).toBeUndefined()
})

it('deletes after confirming', async () => {
  service.fetchAll.mockResolvedValue({ downloads })
  service.remove.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()

  await rowActionProps<Row>(wrapper, downloads[0]).onDelete({
    closeAlert: vi.fn(),
    setLoading: vi.fn(),
  })
  await flushPromises()

  expect(service.remove).toHaveBeenCalledWith('d1')
  expect(service.fetchAll).toHaveBeenCalledTimes(2)
})

it('offers nothing to change without create, update or delete rights', async () => {
  access.granted = new Set()
  service.fetchAll.mockResolvedValue({ downloads })
  const wrapper = mountView()
  await flushPromises()

  expect(cardRows(wrapper)).toHaveLength(2)
  expect(
    wrapper.findAll('button').filter((b) => b.text().includes('Tambah')),
  ).toHaveLength(0)
  expect(wrapper.find('button[aria-label^="Naikkan"]').exists()).toBe(false)
  const columns = wrapper
    .getComponent({ name: 'DataTable' })
    .props('columns') as { id?: string }[]
  expect(columns.some((column) => column.id === 'actions')).toBe(false)
})

it('lets a user who may only update edit and move but not delete', async () => {
  access.granted = new Set(['admission-downloads.update'])
  service.fetchAll.mockResolvedValue({ downloads })
  const wrapper = mountView()
  await flushPromises()

  const props = rowActionProps<Row>(wrapper, downloads[0])
  expect(props.hideEdit).toBe(false)
  expect(props.hideDelete).toBe(true)
  expect(
    cardRow(wrapper, 0)
      .find('button[aria-label="Turunkan Brosur PPDB"]')
      .exists(),
  ).toBe(true)
})

it('shows the load error with a retry', async () => {
  service.fetchAll.mockResolvedValueOnce({ error: 'Gagal memuat.' })
  service.fetchAll.mockResolvedValueOnce({ downloads })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.get('[role="alert"]').text()).toContain('Gagal memuat.')
  await wrapper
    .findAll('button')
    .find((b) => b.text().includes('Coba lagi'))!
    .trigger('click')
  await flushPromises()

  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(cardRows(wrapper)).toHaveLength(2)
})
