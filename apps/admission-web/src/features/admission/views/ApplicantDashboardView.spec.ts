// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ApplicantDashboardView from './ApplicantDashboardView.vue'

const state = vi.hoisted(() => {
  const initial: {
    application: unknown
    dashboardError: string | null
    notificationsError: boolean
    announcementsError: boolean
    fetchDashboard: ReturnType<typeof vi.fn>
  } = {
    application: null,
    dashboardError: null,
    notificationsError: false,
    announcementsError: false,
    fetchDashboard: vi.fn(),
  }
  return initial
})
vi.mock('../composables/useMyApplication', async () => {
  const { computed, ref } = await import('vue')
  return {
    useMyApplication: () => ({
      application: computed(() => state.application),
      dashboardError: computed(() => state.dashboardError),
      notificationsError: computed(() => state.notificationsError),
      announcementsError: computed(() => state.announcementsError),
      notifications: ref([]),
      announcements: ref([]),
      unreadCount: ref(0),
      loading: ref(false),
      fetchDashboard: state.fetchDashboard,
      markAllRead: vi.fn(),
    }),
  }
})
vi.mock('@/features/platform/auth', () => ({
  useRoleGuard: () => ({ can: () => false }),
}))

const stubs = Object.fromEntries(
  [
    'Card',
    'CardContent',
    'CardHeader',
    'CardTitle',
    'CardDescription',
    'Badge',
    'StatusBadge',
  ].map((name) => [name, { template: '<div><slot /></div>' }]),
)
const mountView = () =>
  mount(ApplicantDashboardView, {
    global: {
      stubs: {
        ...stubs,
        RouterLink: {
          props: ['to'],
          template:
            "<a :href=\"typeof to === 'string' ? to : to.path + (to.query?.step ? '?step=' + to.query.step : '')\"><slot /></a>",
        },
      },
    },
  })
const draft = {
  id: 'app-1',
  status: 'DRAFT',
  fullName: 'Contoh',
  registrationNumber: 'REG-1',
  wave: { name: 'Gelombang' },
  documentTypes: [],
  documents: [],
  payment: null,
  submittedAt: null,
  revisionNote: null,
  decisionNote: null,
}

it.each([
  ['DRAFT', 'Silakan lengkapi formulir pendaftaran.'],
  ['REVISION_NEEDED', 'Formulir perlu diperbaiki sesuai catatan panitia.'],
  ['SUBMITTED', 'Formulir sedang diverifikasi oleh panitia.'],
  ['VERIFIED', 'Mohon menunggu hasil seleksi.'],
  ['ACCEPTED', 'Mohon menunggu proses daftar ulang.'],
  ['ENROLLING', 'Data Anda sedang diproses sebagai santri baru.'],
  ['ENROLLED', 'Anda resmi terdaftar sebagai santri.'],
  ['REJECTED', 'Pendaftaran Anda belum dapat diterima.'],
] as const)('gives truthful next action for %s', (status, expected) => {
  state.application = { ...draft, status }
  state.dashboardError = null
  const wrapper = mountView()
  expect(wrapper.text()).toContain(expected)
  expect(wrapper.find('a[href="/registration/form"]').exists()).toBe(
    status === 'DRAFT' || status === 'REVISION_NEEDED',
  )
})

it('offers retry rather than empty data on failed load', async () => {
  state.application = null
  state.dashboardError = 'load-failed'
  const wrapper = mountView()
  expect(wrapper.text()).not.toContain('Belum ada data pendaftaran')
  await wrapper.get('button').trigger('click')
  expect(state.fetchDashboard).toHaveBeenCalled()
})

it('does not send authenticated applicants to guest signup', () => {
  state.application = null
  state.dashboardError = 'not-found'
  const wrapper = mountView()
  expect(wrapper.find('a[href="/"]').exists()).toBe(false)
})

it('lists what the applicant still has to do', () => {
  state.dashboardError = null
  state.application = {
    ...draft,
    status: 'REVISION_NEEDED',
    documentTypes: [
      { id: 'kk', name: 'Kartu Keluarga', requirement: 'REQUIRED' },
      { id: 'akta', name: 'Akta Kelahiran', requirement: 'REQUIRED' },
    ],
    documents: [
      { documentTypeId: 'kk', status: 'REJECTED', note: 'Buram' },
      { documentTypeId: 'akta', status: 'APPROVED', note: null },
    ],
    payment: { status: 'UNPAID', amount: 150000, note: null },
  }
  const wrapper = mountView()

  expect(wrapper.text()).toContain('Langkah yang perlu diselesaikan')
  expect(wrapper.text()).toContain('Unggah ulang Kartu Keluarga')
  expect(wrapper.text()).toContain('Buram')
  expect(wrapper.text()).toContain('Unggah bukti pembayaran')
  expect(wrapper.text()).toContain('1 dari 2 berkas')
  expect(
    wrapper.find('a[href="/registration/form?step=documents"]').exists(),
  ).toBe(true)
  expect(
    wrapper.find('a[href="/registration/form?step=payment"]').exists(),
  ).toBe(true)
})

it('has nothing left to do once enrolled', () => {
  state.dashboardError = null
  state.application = {
    ...draft,
    status: 'ENROLLED',
    payment: { status: 'VERIFIED', amount: 150000, note: null },
  }
  const wrapper = mountView()

  expect(wrapper.text()).not.toContain('Langkah yang perlu diselesaikan')
})

it('asks for no transfer when the wave is free', () => {
  state.dashboardError = null
  state.application = {
    ...draft,
    status: 'SUBMITTED',
    payment: { status: 'UNPAID', amount: 0, note: null },
  }
  const wrapper = mountView()

  expect(wrapper.text()).toContain('Tanpa biaya')
  expect(wrapper.text()).not.toContain('Unggah bukti pembayaran')
})

it('shows the yellow box with the date and hides it when nothing is left', () => {
  state.dashboardError = null
  const later = {
    id: 'ijazah',
    name: 'Ijazah SD',
    requirement: 'LATER',
    dueDate: '2026-09-30',
  }
  state.application = {
    ...draft,
    status: 'ACCEPTED',
    documentTypes: [later],
    documents: [],
    payment: { status: 'VERIFIED', amount: 150000, note: null },
  }
  const shown = mountView()
  const box = shown.get('[data-test="late-reminders"]')
  expect(box.text()).toContain('Ijazah SD')
  expect(box.text()).toContain('30 September 2026')

  state.application = {
    ...draft,
    status: 'ACCEPTED',
    documentTypes: [later],
    documents: [{ documentTypeId: 'ijazah', status: 'PENDING', note: null }],
    payment: { status: 'VERIFIED', amount: 150000, note: null },
  }
  expect(mountView().find('[data-test="late-reminders"]').exists()).toBe(false)
})

it('hides the yellow box while the applicant can still edit', () => {
  state.dashboardError = null
  state.application = {
    ...draft,
    status: 'DRAFT',
    documentTypes: [{ id: 'ijazah', name: 'Ijazah SD', requirement: 'LATER' }],
    documents: [],
  }
  expect(mountView().find('[data-test="late-reminders"]').exists()).toBe(false)
})
