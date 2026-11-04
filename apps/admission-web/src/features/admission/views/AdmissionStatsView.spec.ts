// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdmissionStatsView from './AdmissionStatsView.vue'

const state = vi.hoisted(() => {
  const initial: {
    stats: unknown
    error: string | null
    academicYears: unknown[]
    fetchStats: ReturnType<typeof vi.fn>
  } = { stats: null, error: null, academicYears: [], fetchStats: vi.fn() }
  return initial
})
vi.mock('../composables/useAdmissionStats', async () => {
  const { computed, ref } = await import('vue')
  return {
    useAdmissionStats: () => ({
      stats: computed(() => state.stats),
      error: computed(() => state.error),
      loading: ref(false),
      waves: ref([]),
      academicYears: computed(() => state.academicYears),
      fetchStats: state.fetchStats,
      fetchWaves: vi.fn(),
      fetchAcademicYears: vi.fn().mockResolvedValue(undefined),
    }),
  }
})

const stubs = Object.fromEntries(
  ['Card', 'CardHeader', 'CardContent', 'CardTitle'].map((name) => [
    name,
    { template: '<div><slot /></div>' },
  ]),
)

beforeEach(() => {
  state.error = null
  state.stats = null
  state.academicYears = []
  state.fetchStats.mockClear()
})

it('counts admin-actionable statuses and includes enrolling', () => {
  state.stats = {
    total: 18,
    byStatus: {
      SUBMITTED: 2,
      VERIFIED: 3,
      ACCEPTED: 4,
      REVISION_NEEDED: 8,
      ENROLLING: 1,
    },
    waves: [],
  }
  const wrapper = mount(AdmissionStatsView, {
    global: { stubs: { ...stubs, RouterLink: true } },
  })
  expect(wrapper.text()).toContain('Sedang Didaftarkan')
  expect(
    wrapper
      .findAll('p')
      .find((p) => p.text() === 'Perlu tindakan')
      ?.element.nextElementSibling?.textContent?.trim(),
  ).toBe('9')
  expect(wrapper.text()).toContain('Tidak ada data.')
})

it('offers retry on failed statistics', async () => {
  state.error = 'offline'
  const wrapper = mount(AdmissionStatsView, { global: { stubs } })
  await flushPromises()
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Coba lagi')!
    .trigger('click')
  expect(state.fetchStats).toHaveBeenCalledTimes(2)
})

it('opens on the active academic year', async () => {
  state.academicYears = [
    { id: 'year-old', name: '2025/2026', isActive: false },
    { id: 'year-now', name: '2026/2027', isActive: true },
  ]
  mount(AdmissionStatsView, { global: { stubs } })
  await flushPromises()
  expect(state.fetchStats).toHaveBeenCalledOnce()
  expect(state.fetchStats).toHaveBeenCalledWith({
    academicYearId: 'year-now',
    waveId: undefined,
  })
})

it('puts statistics filters behind one mobile control', async () => {
  const dialogStubs = Object.fromEntries(
    [
      'Dialog',
      'DialogContent',
      'DialogHeader',
      'DialogTitle',
      'DialogDescription',
      'DialogFooter',
    ].map((name) => [name, { template: '<div><slot /></div>' }]),
  )
  const wrapper = mount(AdmissionStatsView, {
    global: { stubs: { ...stubs, ...dialogStubs, RouterLink: true } },
  })
  expect(
    wrapper.findAll('button').some((button) => button.text() === 'Filter'),
  ).toBe(true)
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Filter')!
    .trigger('click')
  expect(
    wrapper
      .findAll('[data-test="mobile-stats-filter"] label')
      .map((label) => label.text()),
  ).toEqual(['Tahun Ajaran', 'Gelombang'])
  wrapper.unmount()
})
