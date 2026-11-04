// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DocumentReviewView from './DocumentReviewView.vue'

const service = vi.hoisted(() => ({
  fetchReview: vi.fn(),
  decide: vi.fn(),
  send: vi.fn(),
}))
vi.mock('../services/documentReviewService', () => ({
  documentReviewService: service,
}))
vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getFile: vi.fn().mockResolvedValue({ data: new Blob(['%PDF-1.4']) }),
  },
}))

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

const route = vi.hoisted(() => ({
  params: { applicationId: 'app1' },
  meta: {
    breadcrumbs: [
      { title: 'Admin PSB', href: '/admin' },
      { title: 'Verifikasi Berkas', href: '/admin/document-reviews' },
      { title: 'Periksa' },
    ],
  },
}))
const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router,
}))

const breadcrumbs = vi.hoisted(() => ({
  source: null as null | (() => unknown),
}))
vi.mock('@mts241alikhlash/web-shared/composables/useBreadcrumbs', () => ({
  useBreadcrumbs: (source: () => unknown) => {
    breadcrumbs.source = source
  },
}))

const passthrough = { template: '<div><slot /></div>' }
const PreviewStub = {
  props: ['open', 'file'],
  template:
    '<div data-test="preview" :data-open="String(open)" :data-file="file?.id" />',
}

const file = (id: string, name: string) => ({
  id,
  originalName: name,
  mimeType: 'application/pdf',
  storageKey: `production/admission/documents/${name}`,
})
const doc = (
  id: string,
  documentTypeId: string,
  status: string,
  note: string | null = null,
) => ({
  id,
  documentTypeId,
  status,
  note,
  verifiedAt: null,
  file: file(`file-${id}`, `${documentTypeId}.pdf`),
})
const slot = (
  documentTypeId: string,
  name: string,
  isRequired: boolean,
  document: unknown,
) => ({
  documentTypeId,
  code: documentTypeId.toUpperCase(),
  name,
  isRequired,
  document,
})

function review(overrides: Record<string, unknown> = {}) {
  return {
    applicationId: 'app1',
    registrationNumber: 'PSB-001',
    applicantName: 'Ahmad Fauzi',
    waveName: 'Gelombang 1',
    status: 'SUBMITTED',
    revisionNote: null,
    submittedAt: '2026-10-01T00:00:00.000Z',
    paymentStatus: 'VERIFIED',
    readOnly: false,
    slots: [
      slot('kk', 'Kartu Keluarga', true, doc('d1', 'kk', 'PENDING')),
      slot('akta', 'Akta Kelahiran', true, doc('d2', 'akta', 'APPROVED')),
      slot('surat', 'Surat Prestasi', false, null),
    ],
    ...overrides,
  }
}

function mountView() {
  return mount(DocumentReviewView, {
    global: {
      stubs: {
        FilePreviewDialog: PreviewStub,
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
      },
    },
  })
}

const button = (wrapper: ReturnType<typeof mountView>, test: string) =>
  wrapper.get(`[data-test="${test}"]`)

beforeEach(() => {
  vi.clearAllMocks()
  access.granted = new Set([
    'admission-documents.read',
    'admission-documents.verify',
  ])
  breadcrumbs.source = null
  service.fetchReview.mockResolvedValue({ review: review() })
  service.decide.mockResolvedValue({ success: true })
  service.send.mockResolvedValue({
    success: true,
    result: { status: 'VERIFIED', outcome: 'APPROVED', verified: true },
  })
})

it('shows the applicant and every document with its status', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(service.fetchReview).toHaveBeenCalledWith('app1')
  expect(wrapper.text()).toContain('Ahmad Fauzi')
  expect(wrapper.text()).toContain('PSB-001')
  expect(wrapper.text()).toContain('Gelombang 1')
  const slots = wrapper.findAll('[data-test="slot"]')
  expect(slots).toHaveLength(3)
  expect(slots[0].text()).toContain('Kartu Keluarga')
  expect(slots[0].text()).not.toContain('Menunggu')
  expect(slots[1].text()).toContain('Disetujui')
  expect(slots[2].text()).toContain('Surat Prestasi')
  expect(slots[2].text()).toContain('Belum diunggah')
})

it('puts the applicant’s name in the breadcrumb', async () => {
  mountView()
  await flushPromises()

  expect(breadcrumbs.source?.()).toEqual([
    { title: 'Admin PSB', href: '/admin' },
    { title: 'Verifikasi Berkas', href: '/admin/document-reviews' },
    { title: 'Ahmad Fauzi' },
  ])
})

it('goes back to the queue from the back button', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('button[aria-label="Kembali ke Verifikasi Berkas"]')
    .trigger('click')

  expect(router.push).toHaveBeenCalledWith('/admin/document-reviews')
})

it('opens a file in the preview popup', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="slot"]')
    .get('[data-test="open-file"]')
    .trigger('click')

  const preview = wrapper.get('[data-test="preview"]')
  expect(preview.attributes('data-open')).toBe('true')
  expect(preview.attributes('data-file')).toBe('file-d1')
})

it('approves a document silently and reloads', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="slot"]')
    .get('[data-test="approve"]')
    .trigger('click')
  await flushPromises()

  expect(service.decide).toHaveBeenCalledWith('app1', 'd1', 'APPROVED')
  expect(service.fetchReview).toHaveBeenCalledTimes(2)
})

it('rejects only with a reason', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="slot"]')
    .get('[data-test="reject"]')
    .trigger('click')
  await wrapper.get('[data-test="reject-form"]').trigger('submit')
  await flushPromises()
  expect(service.decide).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Alasan wajib diisi')

  await wrapper.get('[data-test="reject-form"] textarea').setValue('Foto buram')
  await wrapper.get('[data-test="reject-form"]').trigger('submit')
  await flushPromises()

  expect(service.decide).toHaveBeenCalledWith(
    'app1',
    'd1',
    'REJECTED',
    'Foto buram',
  )
  expect(service.fetchReview).toHaveBeenCalledTimes(2)
})

it('keeps the reason dialog open when the decision is refused', async () => {
  service.decide.mockResolvedValue({ success: false })
  const wrapper = mountView()
  await flushPromises()

  await wrapper
    .get('[data-test="slot"]')
    .get('[data-test="reject"]')
    .trigger('click')
  await wrapper.get('[data-test="reject-form"] textarea').setValue('x')
  await wrapper.get('[data-test="reject-form"]').trigger('submit')
  await flushPromises()

  expect(service.fetchReview).toHaveBeenCalledTimes(1)
  expect(wrapper.find('[data-test="reject-form"]').exists()).toBe(true)
})

it('shows the reason of a rejected document and offers to approve it', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [
        slot(
          'kk',
          'Kartu Keluarga',
          true,
          doc('d1', 'kk', 'REJECTED', 'Foto buram'),
        ),
      ],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  const item = wrapper.get('[data-test="slot"]')
  expect(item.text()).toContain('Ditolak')
  expect(item.text()).toContain('Catatan: Foto buram')
  expect(item.find('[data-test="approve"]').exists()).toBe(true)
  expect(item.find('[data-test="reject"]').exists()).toBe(false)
})

it('disables Kirim hasil while a document is undecided, with the reason', async () => {
  const wrapper = mountView()
  await flushPromises()

  expect(button(wrapper, 'send').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain(
    '2 berkas belum diputuskan atau belum diunggah',
  )
  expect(
    button(wrapper, 'request-data-fix').attributes('disabled'),
  ).toBeUndefined()
})

it('counts a missing document as undecided', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [
        slot('kk', 'Kartu Keluarga', true, null),
        slot('akta', 'Akta Kelahiran', true, doc('d2', 'akta', 'APPROVED')),
      ],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  expect(button(wrapper, 'send').attributes('disabled')).toBeDefined()
})

it('requires every document to be decided before sending', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [
        slot('kk', 'Kartu Keluarga', true, doc('d1', 'kk', 'APPROVED')),
        slot('surat', 'Surat Prestasi', false, doc('d3', 'surat', 'PENDING')),
      ],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  expect(button(wrapper, 'send').attributes('disabled')).toBeDefined()

  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [
        slot('kk', 'Kartu Keluarga', true, doc('d1', 'kk', 'APPROVED')),
        slot('surat', 'Surat Prestasi', false, doc('d3', 'surat', 'APPROVED')),
      ],
    }),
  })
  await flushPromises()
})

it('sends the result after confirmation and returns to the queue', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [slot('kk', 'Kartu Keluarga', true, doc('d1', 'kk', 'APPROVED'))],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  await button(wrapper, 'send').trigger('click')
  expect(service.send).not.toHaveBeenCalled()
  await button(wrapper, 'confirm-send').trigger('click')
  await flushPromises()

  expect(service.send).toHaveBeenCalledWith('app1', undefined)
  expect(router.push).toHaveBeenCalledWith('/admin/document-reviews')
})

it('warns in the confirmation that rejected documents return the form', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [
        slot(
          'kk',
          'Kartu Keluarga',
          true,
          doc('d1', 'kk', 'REJECTED', 'Buram'),
        ),
      ],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  expect(wrapper.get('[data-test="send-confirm"]').text()).toContain(
    '1 berkas ditolak, formulir dikembalikan ke pendaftar',
  )
})

it('stays on the page when sending is refused', async () => {
  service.send.mockResolvedValue({ success: false })
  service.fetchReview.mockResolvedValue({
    review: review({
      slots: [slot('kk', 'Kartu Keluarga', true, doc('d1', 'kk', 'APPROVED'))],
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  await button(wrapper, 'confirm-send').trigger('click')
  await flushPromises()

  expect(router.push).not.toHaveBeenCalled()
  expect(service.fetchReview).toHaveBeenCalledTimes(2)
})

it('asks for a data fix only with a note, even while documents are undecided', async () => {
  const wrapper = mountView()
  await flushPromises()

  await wrapper.get('[data-test="note-form"]').trigger('submit')
  await flushPromises()
  expect(service.send).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Catatan wajib diisi')

  await wrapper
    .get('[data-test="note-form"] textarea')
    .setValue('NIK ayah salah')
  await wrapper.get('[data-test="note-form"]').trigger('submit')
  await flushPromises()

  expect(service.send).toHaveBeenCalledWith('app1', 'NIK ayah salah')
  expect(router.push).toHaveBeenCalledWith('/admin/document-reviews')
})

it('shows no action without the verify permission', async () => {
  access.granted = new Set(['admission-documents.read'])
  const wrapper = mountView()
  await flushPromises()

  for (const test of ['approve', 'reject', 'send', 'request-data-fix']) {
    expect(wrapper.find(`[data-test="${test}"]`).exists()).toBe(false)
  }
  expect(wrapper.text()).toContain('Kartu Keluarga')
})

it('is read-only once the application left review, and says why', async () => {
  service.fetchReview.mockResolvedValue({
    review: review({
      status: 'REVISION_NEEDED',
      readOnly: true,
      revisionNote:
        'Berkas yang perlu diunggah ulang:\n- Kartu Keluarga: Buram',
    }),
  })
  const wrapper = mountView()
  await flushPromises()

  for (const test of ['approve', 'reject', 'send', 'request-data-fix']) {
    expect(wrapper.find(`[data-test="${test}"]`).exists()).toBe(false)
  }
  expect(wrapper.text()).toContain('keputusan berkas tidak bisa diubah')
  expect(wrapper.text()).toContain('Kartu Keluarga: Buram')
})

it('links to the applicant detail', async () => {
  const wrapper = mountView()
  await flushPromises()

  await button(wrapper, 'open-detail').trigger('click')

  expect(router.push).toHaveBeenCalledWith('/admin/applicants/app1')
})

it('tells a missing applicant from a failed load, and retries', async () => {
  service.fetchReview.mockResolvedValueOnce({ error: 'not-found' })
  const missing = mountView()
  await flushPromises()
  expect(missing.text()).toContain('Pendaftar tidak ditemukan.')

  service.fetchReview.mockResolvedValueOnce({ error: 'load-failed' })
  const failed = mountView()
  await flushPromises()
  expect(failed.text()).toContain('Gagal memuat')
  await failed
    .findAll('button')
    .find((b) => b.text() === 'Coba lagi')!
    .trigger('click')
  await flushPromises()

  expect(failed.text()).toContain('Ahmad Fauzi')
})
