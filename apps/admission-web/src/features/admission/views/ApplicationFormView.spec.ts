// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { AdmissionApplication } from '../types'
import ApplicationFormView from './ApplicationFormView.vue'

const application: AdmissionApplication = {
  waveIsFull: false,
  id: 'app-1',
  userId: 'user-1',
  waveId: 'wave-1',
  registrationNumber: 'REG-001',
  status: 'DRAFT',
  fullName: 'Budi',
  nickname: null,
  gender: null,
  birthPlace: null,
  birthDate: '2014-05-05',
  nik: null,
  nisn: null,
  religionId: null,
  phone: null,
  email: null,
  childOrder: null,
  siblingCount: null,
  street: null,
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
  documentTypes: [
    {
      id: 'type-1',
      code: 'KK',
      name: 'Kartu Keluarga',
      isRequired: true,
      requirement: 'REQUIRED',
      lateDueMonths: null,
      sortOrder: 1,
      isActive: true,
    },
  ],
}

const { updateStep, fetchMyApplication, formState, routeState, push } =
  vi.hoisted(() => ({
    updateStep: vi.fn(),
    fetchMyApplication: vi.fn(),
    formState: { error: null as string | null },
    routeState: { params: {}, query: {} },
    push: vi.fn(),
  }))

vi.mock('../composables/useFormOptions', async () => {
  const { ref } = await import('vue')
  const options = ref(null)
  return {
    useFormOptions: () => ({
      options,
      load: vi.fn().mockResolvedValue(undefined),
      nameOf: () => '-',
      listOf: () => [],
    }),
  }
})

vi.mock('../composables/useMyApplication', async () => {
  const { computed } = await import('vue')
  return {
    useMyApplication: () => ({
      formError: computed(() => formState.error),
      fetchMyApplication,
      updateStep,
      uploadAttachment: vi.fn(),
      uploadDocument: vi.fn(),
      uploadPaymentProof: vi.fn(),
      submit: vi.fn().mockResolvedValue({ success: true }),
    }),
  }
})

vi.mock('../composables/useAdminRegistration', async () => {
  const { computed, ref } = await import('vue')
  return {
    useAdminRegistration: () => ({
      applicationId: ref<string | null>(null),
      fetchError: computed(() => formState.error),
      fetchApplication: fetchMyApplication,
      updateStep,
      uploadAttachment: vi.fn(),
      uploadDocument: vi.fn(),
      uploadPaymentProof: vi.fn(),
      submit: vi.fn().mockResolvedValue({ success: true }),
    }),
  }
})

vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({ can: () => false }),
}))

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => routeState,
  RouterLink: defineComponent({ template: '<a><slot /></a>' }),
}))

const passthrough = {
  template: '<div><slot /></div>',
}

const stubs = {
  PersonalDataStep: {
    template: '<div><slot /></div>',
    methods: { validate: () => Promise.resolve({ valid: true }) },
  },
  ParentsStep: {
    ...passthrough,
    methods: { validate: () => Promise.resolve({ valid: true }) },
  },
  AddressStep: {
    ...passthrough,
    methods: { validate: () => Promise.resolve({ valid: true }) },
  },
  SchoolStep: {
    ...passthrough,
    methods: { validate: () => Promise.resolve({ valid: true }) },
  },
  AchievementsStep: {
    ...passthrough,
    methods: { validate: () => Promise.resolve({ valid: true }) },
  },
  RegionSelect: passthrough,
  DocumentsStep: {
    props: ['documentTypes'],
    template:
      '<div data-test="document-types">{{ documentTypes.length }}</div>',
  },
  PaymentStep: {
    props: ['editable'],
    template: '<div data-test="payment-editable">{{ editable }}</div>',
  },
  ReviewStep: passthrough,
  StatusBadge: passthrough,
}

async function mountView() {
  const wrapper = mount(ApplicationFormView, { global: { stubs } })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

it('offers retry for failed form fetch rather than calling it missing', async () => {
  formState.error = 'load-failed'
  fetchMyApplication
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(application)
  const wrapper = await mountView()
  expect(wrapper.text()).toContain('Formulir gagal dimuat')
  expect(wrapper.text()).not.toContain('Formulir belum tersedia')
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('Coba lagi'))!
    .trigger('click')
  await flushPromises()
  expect(fetchMyApplication).toHaveBeenCalledTimes(2)
  formState.error = null
})

describe('ApplicationFormView locked wave field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateStep.mockResolvedValue({ success: true })
    fetchMyApplication.mockResolvedValue(application)
  })

  it('never renders the wave as an input or focusable control', async () => {
    const wrapper = await mountView()

    const inputs = wrapper.findAll('input')
    expect(inputs.some((input) => input.element.value === 'Gelombang 1')).toBe(
      false,
    )
    expect(wrapper.find('[tabindex]').exists()).toBe(false)
  })
})

it('puts the form card inside the stepper card with its own title and the actions in the outer footer', async () => {
  vi.clearAllMocks()
  fetchMyApplication.mockResolvedValue(application)
  const wrapper = mount(ApplicationFormView, {
    global: {
      stubs: {
        ...stubs,
        Card: { template: '<section data-test="form-card"><slot /></section>' },
        CardHeader: {
          template: '<header data-test="form-header"><slot /></header>',
        },
        CardFooter: {
          template: '<footer data-test="form-footer"><slot /></footer>',
        },
      },
    },
  })
  await flushPromises()

  const cards = wrapper.findAll('[data-test="form-card"]')
  expect(cards).toHaveLength(2)
  const [outer, inner] = cards
  expect(outer.findAll('ol button')).toHaveLength(8)
  expect(outer.get('[data-test="form-header"]').find('ol').exists()).toBe(true)
  expect(outer.element.contains(inner.element)).toBe(true)
  expect(inner.get('[data-test="form-header"]').text()).toContain('Data Diri')
  expect(inner.get('[data-test="form-header"]').text()).toContain(
    'Langkah 1 dari 8',
  )
  expect(inner.find('.scroll-mt-4').exists()).toBe(true)
  const footer = outer.get('[data-test="form-footer"]')
  expect(inner.element.contains(footer.element)).toBe(false)
  expect(
    footer.findAll('button').some((button) => button.text() === 'Selanjutnya'),
  ).toBe(true)
})

describe('ApplicationFormView steps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMyApplication.mockResolvedValue(application)
  })

  it('lists eight steps with the achievements step after the previous school', async () => {
    const wrapper = await mountView()

    const labels = wrapper.findAll('ol button').map((b) => b.text())

    expect(labels).toHaveLength(8)
    expect(labels[3]).toContain('Sekolah Asal')
    expect(labels[4]).toContain('Prestasi & Beasiswa')
    expect(labels[5]).toContain('Berkas')
    expect(labels[6]).toContain('Pembayaran')
    expect(labels[7]).toContain('Review & Kirim')
  })
})

describe('ApplicationFormView saving a step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMyApplication.mockResolvedValue(application)
  })

  it('keeps the document types, which the save response does not carry', async () => {
    const { documentTypes: _omitted, ...saved } = application
    updateStep.mockResolvedValue({ success: true, data: saved })
    const wrapper = await mountView()

    const next = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Selanjutnya'))
    await next!.trigger('click')
    await flushPromises()
    const steps = wrapper.findAll('ol button')
    await steps[5].trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="document-types"]').text()).toBe('1')
  })
})

describe('ApplicationFormView payment after submitting', () => {
  beforeEach(() => vi.clearAllMocks())

  it('still takes a payment proof once the form is submitted', async () => {
    fetchMyApplication.mockResolvedValue({
      ...application,
      status: 'SUBMITTED',
    })
    const wrapper = await mountView()

    const steps = wrapper.findAll('ol button')
    await steps[6].trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="payment-editable"]').text()).toBe('true')
  })
})

describe.each(['applicant', 'admin'] as const)(
  '%s form step navigation',
  (host) => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.clearAllMocks()
      updateStep.mockResolvedValue({ success: true })
      fetchMyApplication.mockResolvedValue({
        ...application,
        gender: 'MALE',
        birthPlace: 'Bandung',
        birthDate: '2014-01-01',
        financingSourceId: 'financing-1',
        nik: '3205010101140001',
        religionId: 'religion-1',
      })
    })

    afterEach(() => {
      vi.useRealTimers()
      routeState.params = {}
      routeState.query = {}
    })

    async function flushForm() {
      await flushPromises()
      await vi.runAllTimersAsync()
      await flushPromises()
    }

    async function mountHost(realAchievements = false) {
      const global = {
        stubs: {
          ...stubs,
          PersonalDataStep: false,
          ParentsStep: false,
          AddressStep: false,
          SchoolStep: false,
          AchievementsStep: !realAchievements,
          ReviewStep: false,
          Dialog: passthrough,
          DialogContent: passthrough,
          DialogHeader: passthrough,
          DialogTitle: passthrough,
          DialogDescription: passthrough,
          ScrollArea: passthrough,
        },
      }
      routeState.params = host === 'admin' ? { id: 'app-1' } : {}
      const wrapper = mount(ApplicationFormView, { global })
      await flushForm()
      return wrapper
    }

    it('moves on from an empty achievements and scholarships step without saving what did not change', async () => {
      const wrapper = await mountHost(true)
      await wrapper.findAll('ol button')[4].trigger('click')
      await flushForm()
      expect(wrapper.findAll('ol button')[4].classes()).toContain('bg-primary')
      updateStep.mockClear()

      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Selanjutnya')!
        .trigger('click')
      await flushForm()

      expect(updateStep).not.toHaveBeenCalled()
      expect(wrapper.findAll('ol button')[5].classes()).toContain('bg-primary')
    })

    it('saves edited outgoing data before a direct step click changes steps', async () => {
      let finishSave!: (result: { success: boolean }) => void
      updateStep.mockImplementationOnce(
        () =>
          new Promise<{ success: boolean }>((resolve) => {
            finishSave = resolve
          }),
      )
      const wrapper = await mountHost()
      await wrapper.get('input[name="fullName"]').setValue('Budi Edited')

      await wrapper.findAll('ol button')[1].trigger('click')
      await flushForm()

      expect(updateStep).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Budi Edited' }),
      )
      expect(wrapper.find('input[name="fullName"]').exists()).toBe(true)
      finishSave({ success: true })
      await flushForm()
      expect(wrapper.find('input[name="parents[0].name"]').exists()).toBe(true)
    })

    it('keeps current step and edited data when a direct-click save fails', async () => {
      updateStep.mockResolvedValue({ success: false })
      const wrapper = await mountHost()
      await wrapper.get('input[name="fullName"]').setValue('Unsaved Budi')

      await wrapper.findAll('ol button')[5].trigger('click')
      await flushForm()

      expect(
        wrapper.get<HTMLInputElement>('input[name="fullName"]').element.value,
      ).toBe('Unsaved Budi')
      expect(wrapper.findAll('ol button')[0].classes()).toContain('bg-primary')
      expect(wrapper.text()).toContain('Gagal menyimpan')
      expect(
        wrapper
          .findAll('ol button')
          .every((button) => button.attributes('disabled') === undefined),
      ).toBe(true)
    })

    it.each([
      [0, 'fullName', '', 'next'],
      [0, 'fullName', '', 'direct'],
      [1, 'parents[0].name', '', 'next'],
      [1, 'parents[0].name', '', 'direct'],
      [2, 'street', '', 'next'],
      [2, 'street', '', 'direct'],
      [3, 'graduationYear', '1900', 'next'],
      [3, 'graduationYear', '1900', 'direct'],
    ] as const)(
      'blocks invalid step %i (%s) on %s input through %s navigation',
      async (step, field, value, navigation) => {
        const wrapper = await mountHost()
        if (step > 0) {
          await wrapper.findAll('ol button')[step].trigger('click')
          await flushForm()
        }
        await wrapper.get(`input[name="${field}"]`).setValue(value)
        updateStep.mockClear()

        const target =
          navigation === 'direct'
            ? wrapper.findAll('ol button')[7]
            : wrapper
                .findAll('button')
                .find((button) => button.text() === 'Selanjutnya')!
        await target.trigger('click')
        await flushForm()

        expect(updateStep).not.toHaveBeenCalled()
        expect(wrapper.findAll('ol button')[step].classes()).toContain(
          'bg-primary',
        )
        expect(
          wrapper.get<HTMLInputElement>(`input[name="${field}"]`).element.value,
        ).toBe(value)
      },
    )

    it.each(['previous', 'direct'])(
      'saves incomplete outgoing data when moving backward through %s',
      async (navigation) => {
        const wrapper = await mountHost()
        await wrapper.findAll('ol button')[2].trigger('click')
        await flushForm()
        await wrapper.get('input[name="street"]').setValue('Jl. Edited')
        updateStep.mockClear()

        const target =
          navigation === 'direct'
            ? wrapper.findAll('ol button')[0]
            : wrapper
                .findAll('button')
                .find((button) => button.text() === 'Sebelumnya')!
        await target.trigger('click')
        await flushForm()

        expect(updateStep).toHaveBeenCalledWith(
          expect.objectContaining({ street: 'Jl. Edited', rt: undefined }),
        )
        expect(wrapper.find('input[name="street"]').exists()).toBe(false)
      },
    )

    it('retains incomplete outgoing data when a backward save fails', async () => {
      const wrapper = await mountHost()
      await wrapper.findAll('ol button')[2].trigger('click')
      await flushForm()
      await wrapper.get('input[name="street"]').setValue('Unsaved street')
      updateStep.mockResolvedValue({ success: false })

      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Sebelumnya')!
        .trigger('click')
      await flushForm()

      expect(
        wrapper.get<HTMLInputElement>('input[name="street"]').element.value,
      ).toBe('Unsaved street')
      expect(wrapper.findAll('ol button')[2].classes()).toContain('bg-primary')
    })

    it('ignores duplicate navigation while validation and save are pending', async () => {
      let finishSave!: (result: { success: boolean }) => void
      updateStep.mockImplementation(
        () =>
          new Promise<{ success: boolean }>((resolve) => {
            finishSave = resolve
          }),
      )
      const wrapper = await mountHost()
      await wrapper.get('input[name="fullName"]').setValue('Nama yang diubah')
      const next = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Selanjutnya')!
      next.element.click()
      next.element.click()
      await flushForm()

      expect(updateStep).toHaveBeenCalledTimes(1)
      expect(wrapper.find('input[name="fullName"]').exists()).toBe(true)
      expect(
        wrapper.get<HTMLInputElement>('input[name="fullName"]').element
          .disabled,
      ).toBe(true)
      expect(
        wrapper
          .findAll('ol button')
          .every((button) => button.attributes('disabled') !== undefined),
      ).toBe(true)
      await wrapper.findAll('ol button')[3].trigger('click')
      finishSave({ success: true })
      await flushForm()
      expect(wrapper.findAll('ol button')[1].classes()).toContain('bg-primary')
    })

    it('moves forward on a read-only incomplete form without saving or validating', async () => {
      fetchMyApplication.mockResolvedValue({
        ...application,
        status: 'SUBMITTED',
      })
      const wrapper = await mountHost()

      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Selanjutnya')!
        .trigger('click')
      await flushForm()

      expect(updateStep).not.toHaveBeenCalled()
      expect(wrapper.findAll('ol button')[1].classes()).toContain('bg-primary')
      await wrapper.findAll('ol button')[6].trigger('click')
      await flushForm()
      expect(wrapper.find('[data-test="payment-editable"]').text()).toBe('true')
    })

    it('does not save when clicking the current step', async () => {
      const wrapper = await mountHost()
      await wrapper.findAll('ol button')[0].trigger('click')
      await flushForm()
      expect(updateStep).not.toHaveBeenCalled()
      expect(wrapper.find('input[name="fullName"]').exists()).toBe(true)
    })

    it('does not tell the applicant that edits are unsaved', async () => {
      const wrapper = await mountHost()
      await wrapper.get('input[name="fullName"]').setValue('Nama yang diubah')
      expect(wrapper.text()).not.toContain('Perubahan belum disimpan')
      wrapper.unmount()
    })

    it('does not call the server when the step was not edited', async () => {
      const wrapper = await mountHost()
      updateStep.mockClear()
      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Selanjutnya')!
        .trigger('click')
      await flushForm()
      expect(updateStep).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('saves the step once when it was edited', async () => {
      const wrapper = await mountHost()
      updateStep.mockClear()
      await wrapper.get('input[name="fullName"]').setValue('Nama yang diubah')
      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Selanjutnya')!
        .trigger('click')
      await flushForm()
      expect(updateStep).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })
  },
)

describe('ApplicationFormView introduction', () => {
  const fresh = {
    ...application,
    birthDate: null,
    wave: {
      ...application.wave!,
      description: 'Tes baca Al-Quran pada hari Sabtu.',
    },
  }

  async function mountWithDialog() {
    const wrapper = mount(ApplicationFormView, {
      global: {
        stubs: {
          ...stubs,
          Dialog: {
            props: ['open'],
            template: '<div v-if="open"><slot /></div>',
          },
          DialogContent: passthrough,
          DialogHeader: passthrough,
          DialogTitle: passthrough,
          DialogDescription: passthrough,
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  const button = (wrapper: VueWrapper, text: string) =>
    wrapper.findAll('button').find((item) => item.text() === text)

  it('asks a new applicant to agree to the wave rules before step 1', async () => {
    vi.clearAllMocks()
    fetchMyApplication.mockResolvedValue(fresh)
    const wrapper = await mountWithDialog()

    expect(wrapper.text()).toContain('Ketentuan Pendaftaran')
    expect(wrapper.text()).toContain('Gelombang 1')
    expect(wrapper.text()).toContain('Tes baca Al-Quran pada hari Sabtu.')
    expect(wrapper.text()).toContain('Kartu Keluarga')
    expect(wrapper.text()).toContain('REG-001')
    const start = button(wrapper, 'Mulai Isi Formulir')!
    expect(start.attributes('disabled')).toBeDefined()

    await wrapper.get('[role="checkbox"]').trigger('click')
    await start.trigger('click')

    expect(wrapper.text()).not.toContain('Ketentuan Pendaftaran')
  })

  it('lets a returning applicant close the rules and open them again', async () => {
    vi.clearAllMocks()
    fetchMyApplication.mockResolvedValue(application)
    const wrapper = await mountWithDialog()

    expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
    await button(wrapper, 'Tutup')!.trigger('click')
    expect(wrapper.text()).not.toContain('Ketentuan Pendaftaran')

    await button(wrapper, 'Lihat ketentuan')!.trigger('click')
    expect(wrapper.text()).toContain('Ketentuan Pendaftaran')
  })
})

it.each([
  ['documents', 5],
  ['payment', 6],
  ['unknown', 0],
  [['payment', 'documents'], 0],
] as const)('opens only supported step %j', async (step, index) => {
  routeState.params = {}
  routeState.query = { step }
  fetchMyApplication.mockResolvedValue({ ...application, status: 'SUBMITTED' })
  const wrapper = await mountView()
  expect(wrapper.findAll('ol button')[index].attributes('aria-current')).toBe(
    'step',
  )
  expect(updateStep).not.toHaveBeenCalled()
  wrapper.unmount()
  routeState.query = {}
})

it('fills an existing application on behalf of the applicant on the admin route', async () => {
  routeState.params = { id: 'app-1' }
  fetchMyApplication.mockReset().mockResolvedValue(application)
  const wrapper = await mountView()
  expect(wrapper.text()).toContain('Langkah 1 dari 8')
  expect(
    wrapper.find('[aria-label="Kembali ke detail pendaftar"]').exists(),
  ).toBe(true)
  expect(wrapper.text()).not.toContain('Ketentuan Pendaftaran')
  routeState.params = {}
})

it('offers retry on the admin route without calling the applicant missing', async () => {
  routeState.params = { id: 'app-1' }
  formState.error = 'load-failed'
  fetchMyApplication
    .mockReset()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(application)
  const wrapper = await mountView()
  expect(wrapper.text()).toContain('Formulir gagal dimuat')
  expect(wrapper.text()).not.toContain('Data pendaftar tidak ditemukan')
  formState.error = null
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('Coba lagi'))!
    .trigger('click')
  await flushPromises()
  expect(fetchMyApplication).toHaveBeenCalledTimes(2)
  routeState.params = {}
})

describe('ApplicationFormView stepper flags and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.params = {}
  })

  it('flags the Berkas step when a document was rejected', async () => {
    fetchMyApplication.mockResolvedValue({
      ...application,
      documents: [
        { id: 'd1', documentTypeId: 'kk', status: 'REJECTED', note: 'Buram' },
      ],
    })
    const wrapper = await mountView()

    const buttons = wrapper.findAll('ol button')
    expect(buttons[5].classes()).toContain('border-destructive')
    expect(buttons[5].text()).toContain('perlu diperbaiki')
    expect(buttons[6].classes()).not.toContain('border-destructive')
    wrapper.unmount()
  })

  it('flags the Pembayaran step when the payment was rejected', async () => {
    fetchMyApplication.mockResolvedValue({
      ...application,
      payment: { id: 'p1', status: 'REJECTED', note: 'Nominal kurang' },
    })
    const wrapper = await mountView()

    const buttons = wrapper.findAll('ol button')
    expect(buttons[6].classes()).toContain('border-destructive')
    expect(buttons[5].classes()).not.toContain('border-destructive')
    wrapper.unmount()
  })

  it('flags no step when nothing was rejected', async () => {
    fetchMyApplication.mockResolvedValue(application)
    const wrapper = await mountView()

    expect(
      wrapper
        .findAll('ol button')
        .some((button) => button.classes().includes('border-destructive')),
    ).toBe(false)
    wrapper.unmount()
  })

  it('offers a back button to the dashboard for the applicant and to the detail for an admin', async () => {
    fetchMyApplication.mockResolvedValue(application)
    const applicant = await mountView()
    expect(applicant.find('[aria-label="Kembali ke dasbor"]').exists()).toBe(
      true,
    )
    applicant.unmount()

    routeState.params = { id: 'app-1' }
    const admin = await mountView()
    expect(
      admin.find('[aria-label="Kembali ke detail pendaftar"]').exists(),
    ).toBe(true)
    routeState.params = {}
    admin.unmount()
  })

  it('does not scroll the page when a step fails validation', async () => {
    fetchMyApplication.mockResolvedValue(application)
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const wrapper = await mountView()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Selanjutnya')!
      .trigger('click')
    await flushPromises()

    expect(scroll).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
