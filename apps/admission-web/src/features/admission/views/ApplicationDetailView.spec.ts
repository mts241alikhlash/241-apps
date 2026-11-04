// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import type { AdmissionApplication } from '../types'
import ApplicationDetailView from './ApplicationDetailView.vue'

const { application, acting, error, fetchDetail, setActing } = vi.hoisted(
  () => ({
    application: { value: null as AdmissionApplication | null },
    acting: { value: false },
    error: { value: null as 'not-found' | 'load-failed' | null },
    fetchDetail: vi.fn(),
    setActing: vi.fn(),
  }),
)

const access = vi.hoisted(() => ({ granted: new Set<string>() }))
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({
    can: (...permissions: string[]) =>
      permissions.some((p) => access.granted.has(p)),
  }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'app-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../composables/useApplicationDetail', async () => {
  const { ref } = await import('vue')
  return {
    useApplicationDetail: () => {
      const actingRef = ref(acting.value)
      setActing.mockImplementation((value: boolean) => {
        actingRef.value = value
      })
      return {
        application: ref(application.value),
        loading: ref(false),
        acting: actingRef,
        error: ref(error.value),
        fetchDetail,
        approveDocument: vi.fn(),
        rejectDocument: vi.fn(),
        verifyPaymentApprove: vi.fn(),
        rejectPayment: vi.fn(),
        requestRevision: vi.fn(),
        verifyApplication: vi.fn(),
        accept: vi.fn(),
        reject: vi.fn(),
        enroll: vi.fn(),
      }
    },
  }
})

vi.mock('../composables/useFormOptions', () => ({
  useFormOptions: () => ({
    load: vi.fn().mockResolvedValue(undefined),
    nameOf: () => '-',
  }),
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../components/FilePreviewDialog.vue', () => ({
  default: {
    props: ['open', 'file'],
    template:
      '<div data-test="preview" :data-open="String(open)" :data-file="file?.id" />',
  },
}))

const card = defineComponent({ template: '<section><slot /></section>' })
const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: {
    asChild: Boolean,
    disabled: Boolean,
    variant: String,
    size: String,
  },
  template:
    '<button v-if="!asChild" :disabled="disabled"><slot /></button><slot v-else />',
})
const label = defineComponent({
  template: '<label v-bind="$attrs"><slot /></label>',
})
const input = defineComponent({
  inheritAttrs: false,
  template: '<input v-bind="$attrs" />',
})
const textarea = defineComponent({
  inheritAttrs: false,
  template: '<textarea v-bind="$attrs"></textarea>',
})

const ActionCellStub = defineComponent({
  props: {
    viewLabel: String,
    manageLabel: String,
    editLabel: String,
    deleteLabel: String,
    hideEdit: Boolean,
    hideDelete: Boolean,
  },
  setup: (props) => () =>
    h('div', { 'data-test': 'action-cell' }, [
      props.viewLabel && h('span', props.viewLabel),
      props.manageLabel && h('span', props.manageLabel),
      !props.hideEdit && props.editLabel && h('span', props.editLabel),
      !props.hideDelete && props.deleteLabel && h('span', props.deleteLabel),
    ]),
})

const stubs = {
  ActionCell: ActionCellStub,
  FloatingLabelField: passthrough,
  Card: card,
  CardContent: passthrough,
  CardDescription: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  Badge: passthrough,
  Tooltip: passthrough,
  TooltipTrigger: passthrough,
  TooltipContent: passthrough,
  Button: button,
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogFooter: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  ExternalLink: true,
  Input: input,
  Label: label,
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
  },
  StatusBadge: passthrough,
  Textarea: textarea,
}

const draft: AdmissionApplication = {
  waveIsFull: false,
  id: 'app-1',
  userId: 'user-1',
  waveId: 'wave-1',
  registrationNumber: 'REG-001',
  status: 'DRAFT',
  fullName: 'Contoh Pendaftar',
  nickname: null,
  gender: null,
  birthPlace: null,
  birthDate: null,
  nik: null,
  nisn: null,
  religionId: null,
  phone: null,
  email: 'alamatemailyangpanjangtanpaspasi@example.test',
  childOrder: 0,
  siblingCount: 0,
  street: 'JalanPanjangTanpaSpasi'.repeat(5),
  rt: null,
  rw: null,
  village: null,
  district: null,
  city: null,
  province: null,
  postalCode: null,
  previousSchoolName: null,
  previousSchoolNpsn: null,
  previousSchoolAddress: null,
  graduationYear: null,
  submittedAt: null,
  revisionNote: null,
  verifiedAt: null,
  decidedAt: null,
  decisionNote: null,
  enrolledAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  wave: {
    id: 'wave-1',
    name: 'Gelombang 1',
    code: 'W1',
    academicYearId: 'year-1',
    academicYear: { id: 'year-1', name: '2026/2027' },
    startDate: '2026-01-01',
    endDate: '2026-02-01',
    quota: 100,
    registrationFee: 100000,
    description: null,
    isActive: true,
    lastRegistrationSeq: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  parents: [],
  documents: [],
  payment: null,
  documentTypes: [],
}

async function mountView() {
  const wrapper = mount(ApplicationDetailView, { global: { stubs } })
  await flushPromises()
  return wrapper
}

async function openTab(
  wrapper: Awaited<ReturnType<typeof mountView>>,
  label: string,
) {
  await wrapper
    .findAll('button')
    .find((node) => node.text() === label)!
    .trigger('mousedown')
  await flushPromises()
}

describe('ApplicationDetailView', () => {
  beforeEach(() => {
    application.value = { ...draft }
    access.granted = new Set([
      'admission-payments.verify',
      'admission-payments.create',
      'admission-documents.verify',
      'admission-decisions.decide',
      'admission-enrollments.process',
    ])
    acting.value = false
    error.value = null
    vi.clearAllMocks()
  })

  it('uses the underlined tab style', async () => {
    const wrapper = await mountView()

    const list = wrapper.get('[data-slot="tabs-list"]')
    expect(list.classes()).toContain('border-b')
    expect(list.classes()).not.toContain('bg-muted')
    expect(wrapper.get('[data-slot="tabs-trigger"]').classes()).toContain(
      'border-b-2',
    )
  })

  it('groups draft values, wraps long values, and avoids nested link buttons', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).not.toContain('Dikirim -')
    expect(wrapper.text()).not.toContain('-, -')
    expect(wrapper.text()).toContain('Belum diisi')
    expect(wrapper.find('a button').exists()).toBe(false)

    const email = wrapper
      .findAll('dd')
      .find((node) => node.text() === draft.email)
    await openTab(wrapper, 'Alamat')
    const street = wrapper
      .findAll('dd')
      .find((node) => node.text() === draft.street)
    expect(email?.classes()).toContain('break-all')
    expect(street?.classes()).toContain('break-words')
  })

  it('lists documents in a table with review actions only for unapproved files', async () => {
    application.value = {
      ...draft,
      documentTypes: [
        { id: 'kk', code: 'KK', name: 'Kartu Keluarga', isRequired: true },
        { id: 'akta', code: 'AKTA', name: 'Akta Kelahiran', isRequired: true },
        { id: 'foto', code: 'FOTO', name: 'Pas Foto', isRequired: false },
      ],
      documents: [
        {
          id: 'doc-kk',
          documentTypeId: 'kk',
          status: 'APPROVED',
          note: null,
          file: {
            id: 'file-kk',
            originalName: 'kk.pdf',
            mimeType: 'application/pdf',
            storageKey: 'files/kk.pdf',
          },
        },
        {
          id: 'doc-akta',
          documentTypeId: 'akta',
          status: 'REJECTED',
          note: 'Buram',
          file: { originalName: 'akta.pdf', storageKey: 'files/akta.pdf' },
        },
      ],
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Disetujui')
    expect(rows[0].text()).not.toContain('Setujui')
    expect(rows[0].find('a').exists()).toBe(false)
    await rows[0].get('button[data-test="open-file"]').trigger('click')
    expect(wrapper.get('[data-test="preview"]').attributes('data-open')).toBe(
      'true',
    )
    expect(wrapper.get('[data-test="preview"]').attributes('data-file')).toBe(
      'file-kk',
    )
    expect(rows[1].text()).toContain('Ditolak')
    expect(rows[1].text()).not.toContain('Catatan:')
    expect(wrapper.get('[data-slot="data-table-cards"]').text()).toContain(
      'Status:Ditolak. Buram',
    )
    expect(rows[1].text()).toContain('Setujui')
    expect(rows[1].text()).toContain('Tolak')
    expect(rows[2].text()).toContain('Belum diunggah')
    expect(rows[2].text()).not.toContain('Wajib')
    expect(rows[2].text()).not.toContain('Setujui')
  })

  it('hides the document and application review buttons without admission-documents.verify', async () => {
    access.granted = new Set(['admissions.read'])
    application.value = {
      ...draft,
      status: 'SUBMITTED',
      documentTypes: [
        { id: 'kk', code: 'KK', name: 'Kartu Keluarga', isRequired: true },
      ],
      documents: [
        {
          id: 'doc-kk',
          documentTypeId: 'kk',
          status: 'PENDING',
          note: null,
          file: {
            id: 'file-kk',
            originalName: 'kk.pdf',
            mimeType: 'application/pdf',
            storageKey: 'files/kk.pdf',
          },
        },
      ],
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')

    expect(wrapper.text()).not.toContain('Setujui')
    expect(wrapper.text()).not.toContain('Minta Revisi')
    expect(wrapper.text()).not.toContain('Verifikasi Aplikasi')
    expect(wrapper.text()).toContain('Kartu Keluarga - Contoh Pendaftar.pdf')
  })

  it('hides Terima and Tolak without admission-decisions.decide, and keeps the enrollment button', async () => {
    access.granted = new Set([
      'admissions.read',
      'admission-documents.verify',
      'admission-enrollments.process',
    ])
    application.value = {
      ...draft,
      status: 'VERIFIED',
    } as unknown as AdmissionApplication
    const verified = await mountView()
    expect(verified.text()).not.toContain('Terima')
    expect(verified.findAll('button').map((b) => b.text())).not.toContain(
      'Tolak',
    )

    application.value = {
      ...draft,
      status: 'ACCEPTED',
    } as unknown as AdmissionApplication
    const accepted = await mountView()
    expect(accepted.text()).toContain('Proses Jadi Santri')
  })

  it('shows Terima and Tolak with admission-decisions.decide', async () => {
    application.value = {
      ...draft,
      status: 'VERIFIED',
    } as unknown as AdmissionApplication
    const wrapper = await mountView()

    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(
      expect.arrayContaining(['Terima', 'Tolak']),
    )
  })

  it('shows them with admission-documents.verify', async () => {
    application.value = {
      ...draft,
      status: 'SUBMITTED',
      documentTypes: [
        { id: 'kk', code: 'KK', name: 'Kartu Keluarga', isRequired: true },
      ],
      documents: [
        {
          id: 'doc-kk',
          documentTypeId: 'kk',
          status: 'PENDING',
          note: null,
          file: {
            id: 'file-kk',
            originalName: 'kk.pdf',
            mimeType: 'application/pdf',
            storageKey: 'files/kk.pdf',
          },
        },
      ],
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')

    expect(wrapper.text()).toContain('Setujui')
    expect(wrapper.text()).toContain('Minta Revisi')
    expect(wrapper.text()).toContain('Verifikasi Aplikasi')
  })

  it('marks a document of a deactivated type', async () => {
    application.value = {
      ...draft,
      documentTypes: [
        {
          id: 'old',
          code: 'OLD',
          name: 'Berkas Lama',
          isRequired: false,
          isActive: false,
          sortOrder: 9,
        },
      ],
      documents: [
        {
          id: 'doc-old',
          documentTypeId: 'old',
          status: 'PENDING',
          note: null,
          file: { originalName: 'lama.pdf', storageKey: 'files/lama.pdf' },
        },
      ],
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')

    expect(wrapper.get('tbody').text()).toContain('Berkas Lama (nonaktif)')
    expect(wrapper.get('[data-slot="data-table-cards"]').text()).toContain(
      'Berkas Lama (nonaktif)',
    )
  })

  it('shows no required marker on a deactivated type', async () => {
    application.value = {
      ...draft,
      documentTypes: [
        {
          id: 'kk',
          code: 'KK',
          name: 'Kartu Keluarga',
          isRequired: true,
          requirement: 'REQUIRED',
          lateDueMonths: null,
          isActive: true,
          sortOrder: 1,
        },
        {
          id: 'old',
          code: 'OLD',
          name: 'Berkas Lama',
          isRequired: true,
          requirement: 'REQUIRED',
          lateDueMonths: null,
          isActive: false,
          sortOrder: 9,
        },
      ],
      documents: [],
    }
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('Kartu Keluarga')
    expect(rows[0].text()).not.toContain('(nonaktif)')
    expect(rows[1].text()).toContain('Berkas Lama (nonaktif)')
    const mobile = wrapper.findAll('[data-slot="data-table-cards"] li')
    expect(mobile[0].text()).toContain('Kartu Keluarga')
    expect(mobile[1].text()).toContain('Berkas Lama (nonaktif)')
  })

  it('shows an empty state when the wave has no document types', async () => {
    const wrapper = await mountView()
    await openTab(wrapper, 'Berkas')
    expect(wrapper.text()).toContain('Belum ada jenis berkas')
  })

  it('associates decision fields with labels and disables actions while acting', async () => {
    application.value = { ...draft, status: 'ACCEPTED' }
    acting.value = false
    const wrapper = await mountView()
    await wrapper
      .findAll('button')
      .find((node) => node.text() === 'Proses Jadi Santri')!
      .trigger('click')

    for (const field of wrapper.findAll('input, textarea')) {
      const id = field.attributes('id')
      expect(id).toBeTruthy()
      expect(wrapper.find(`label[for="${id}"]`).exists()).toBe(true)
    }

    setActing(true)
    await nextTick()
    expect(
      wrapper
        .findAll('button')
        .filter((node) => ['Batal', 'Konfirmasi'].includes(node.text()))
        .every((node) => node.attributes('disabled') !== undefined),
    ).toBe(true)
  })

  it('hides Proses Jadi Santri without admission-enrollments.process', async () => {
    access.granted = new Set(['admissions.read'])
    application.value = {
      ...draft,
      status: 'ACCEPTED',
    } as unknown as AdmissionApplication

    const wrapper = await mountView()

    expect(wrapper.text()).not.toContain('Proses Jadi Santri')
  })

  it('asks only for the number that is still missing when enrolling', async () => {
    application.value = {
      ...draft,
      status: 'ACCEPTED',
      nis: '262707001',
      nisn: null,
    } as unknown as AdmissionApplication
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Proses Jadi Santri')!
      .trigger('click')

    expect(wrapper.find('input[id$="-nis"]').exists()).toBe(false)
    expect(wrapper.find('input[id$="-nisn"]').exists()).toBe(true)
  })

  it('enrolls without typing anything when the NIS and NISN exist', async () => {
    application.value = {
      ...draft,
      status: 'ACCEPTED',
      nis: '262707001',
      nisn: '0091234567',
    } as unknown as AdmissionApplication
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Proses Jadi Santri')!
      .trigger('click')

    expect(wrapper.find('input[id$="-nis"]').exists()).toBe(false)
    expect(wrapper.find('input[id$="-nisn"]').exists()).toBe(false)
  })

  it('does not ask to type numbers in the enroll dialog when both exist', async () => {
    application.value = {
      ...draft,
      status: 'ACCEPTED',
      nis: '262707001',
      nisn: '0091234567',
    } as unknown as AdmissionApplication
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Proses Jadi Santri')!
      .trigger('click')

    expect(wrapper.text()).not.toContain('Masukkan NIS/NISN')
    expect(wrapper.text()).toContain('dipakai untuk membuat akun santri')
  })

  it('asks to complete the missing number in the enroll dialog', async () => {
    application.value = {
      ...draft,
      status: 'ACCEPTED',
      nis: '262707001',
      nisn: null,
    } as unknown as AdmissionApplication
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Proses Jadi Santri')!
      .trigger('click')

    expect(wrapper.text()).toContain('Lengkapi nomor yang belum ada')
  })

  it('shows the admission type, the target grade and the NIS', async () => {
    application.value = {
      ...draft,
      status: 'ACCEPTED',
      admissionType: 'TRANSFER',
      targetGradeLevel: 8,
      nis: '262708002',
    } as unknown as AdmissionApplication

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Pindahan')
    expect(wrapper.text()).toContain('Kelas 8')
    expect(wrapper.text()).toContain('262708002')
  })

  it('shows retry only for load failures and keeps 404 distinct', async () => {
    application.value = null
    error.value = 'load-failed'
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Gagal memuat detail pendaftar.')
    const retry = wrapper
      .findAll('button')
      .find((node) => node.text() === 'Coba lagi')
    expect(retry).toBeTruthy()
    fetchDetail.mockClear()
    await retry!.trigger('click')
    expect(fetchDetail).toHaveBeenCalledWith('app-1')

    application.value = null
    error.value = 'not-found'
    const notFound = await mountView()
    expect(notFound.text()).toContain('Pendaftar tidak ditemukan.')
    expect(notFound.text()).not.toContain('Coba lagi')
  })

  it('lets a payment verifier approve or reject a pending proof', async () => {
    application.value = {
      ...draft,
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: { storageKey: 'files/bukti.png' },
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    expect(wrapper.text()).toContain('Verifikasi Pembayaran')
    expect(wrapper.text()).toContain('Tolak')
  })

  it('opens the payment proof in the preview', async () => {
    application.value = {
      ...draft,
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: {
          id: 'file-bukti',
          originalName: 'bukti.png',
          mimeType: 'image/png',
          storageKey: 'files/bukti.png',
        },
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    await wrapper.get('button[data-test="open-file"]').trigger('click')

    expect(wrapper.get('[data-test="preview"]').attributes('data-open')).toBe(
      'true',
    )
    expect(wrapper.get('[data-test="preview"]').attributes('data-file')).toBe(
      'file-bukti',
    )
  })

  it('shows no payment buttons without the verify permission', async () => {
    access.granted = new Set()
    application.value = {
      ...draft,
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: { storageKey: 'files/bukti.png' },
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    expect(wrapper.text()).not.toContain('Verifikasi Pembayaran')
    expect(wrapper.text()).not.toContain('Tolak')
    expect(wrapper.find('button[data-test="open-file"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Bukti Transfer')
  })

  it('links to the payment page with the applicant for those who may add payments', async () => {
    application.value = {
      ...draft,
      id: 'app-1',
      status: 'SUBMITTED',
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: null,
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    const link = wrapper.get('[data-test="add-payment-link"]')
    expect(link.text()).toBe('Tambah')
    expect(JSON.parse(link.attributes('data-to')!)).toEqual({
      name: 'admin-payments',
      query: { applicationId: 'app-1' },
    })
  })

  it.each([
    ['VERIFIED', 'SUBMITTED'],
    ['PENDING', 'ACCEPTED'],
  ])(
    'hides the add link for a %s payment on a %s application',
    async (paymentStatus, status) => {
      application.value = {
        ...draft,
        status,
        payment: {
          id: 'pay1',
          applicationId: 'app-1',
          amount: 150000,
          status: paymentStatus,
          note: null,
          proofFile: null,
        },
      } as unknown as AdmissionApplication
      const wrapper = await mountView()
      await openTab(wrapper, 'Pembayaran')

      expect(wrapper.find('[data-test="add-payment-link"]').exists()).toBe(
        false,
      )
    },
  )

  it('hides the add link without the create permission', async () => {
    access.granted = new Set(['admission-payments.verify'])
    application.value = {
      ...draft,
      status: 'SUBMITTED',
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: null,
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    expect(wrapper.find('[data-test="add-payment-link"]').exists()).toBe(false)
  })

  it('renders achievements and scholarships in DataTable when present', async () => {
    application.value = {
      ...draft,
      achievements: [
        {
          id: 'ach-1',
          competitionName: 'Olimpiade Matematika',
          year: 2025,
          competitionFieldId: 'cf-1',
          competitionLevelId: 'cl-1',
          rank: 'Juara 1',
          organizer: 'Kemendikbud',
          file: {
            id: 'file-ach-1',
            originalName: 'sertifikat-olimpiade.pdf',
            storageKey: 'files/sertifikat-olimpiade.pdf',
          },
        },
      ],
      scholarships: [
        {
          id: 'sch-1',
          scholarshipName: 'Beasiswa Prestasi',
          year: 2025,
          categoryId: 'sc-1',
          providerName: 'Yayasan Peduli',
          providerTypeId: 'spt-1',
          duration: '1 Tahun',
          amount: 5000000,
          kipNumber: 'KIP-123456',
          file: null,
        },
      ],
    } as unknown as AdmissionApplication

    const wrapper = await mountView()
    await openTab(wrapper, 'Prestasi & Beasiswa')

    expect(wrapper.text()).toContain('Olimpiade Matematika')
    expect(wrapper.text()).toContain(
      'Olimpiade Matematika - Contoh Pendaftar.pdf',
    )
    expect(wrapper.text()).toContain('Juara 1')
    expect(wrapper.text()).toContain('Beasiswa Prestasi')
    expect(wrapper.text()).toContain('Yayasan Peduli')
    expect(wrapper.text()).toContain('Rp. 5.000.000')
    expect(wrapper.text()).toContain('KIP-123456')
  })

  it('orders payment footer buttons as tambah pembayaran, tolak, verifikasi', async () => {
    application.value = {
      ...draft,
      status: 'SUBMITTED',
      payment: {
        id: 'pay1',
        applicationId: 'app-1',
        amount: 150000,
        status: 'PENDING',
        note: null,
        proofFile: { storageKey: 'files/bukti.png' },
      },
    } as unknown as AdmissionApplication
    const wrapper = await mountView()
    await openTab(wrapper, 'Pembayaran')

    const footerText = wrapper.find('[data-slot="card-footer"]').text()
    const tambahIdx = footerText.indexOf('Tambah')
    const tolakIdx = footerText.indexOf('Tolak')
    const verifikasiIdx = footerText.indexOf('Verifikasi Pembayaran')

    expect(tambahIdx).toBeGreaterThan(-1)
    expect(tolakIdx).toBeGreaterThan(tambahIdx)
    expect(verifikasiIdx).toBeGreaterThan(tolakIdx)
  })
})
