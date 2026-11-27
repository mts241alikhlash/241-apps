// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import type { OfflineRosterRow, OfflineSchedule } from '../types'
import OfflineScoreEntryView from './OfflineScoreEntryView.vue'

const { service, push, permissions } = vi.hoisted(() => ({
  service: {
    loadSchedules: vi.fn(),
    loadRoster: vi.fn(),
    save: vi.fn(),
    downloadSheet: vi.fn(),
    publish: vi.fn(),
  },
  push: vi.fn(),
  permissions: new Set<string>(),
}))

vi.mock('../services/examOfflineService', () => ({
  examOfflineService: service,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: { scheduleId: 's1' }, query: {} }),
}))
vi.mock('@mts241alikhlash/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))
vi.mock('../components/ScoreImportDialog.vue', () => ({
  default: defineComponent({
    name: 'ScoreImportDialogStub',
    props: { open: Boolean, scheduleId: String },
    emits: ['update:open', 'imported'],
    template:
      '<div v-if="open" data-test="import-dialog" :data-schedule="scheduleId"><button data-test="imported" @click="$emit(\'imported\')" /></div>',
  }),
}))

vi.mock('../components/PublishScoresDialog.vue', () => ({
  default: defineComponent({
    name: 'PublishScoresDialogStub',
    props: {
      open: Boolean,
      missingNames: { type: Array, default: () => [] },
      message: { type: String, default: null },
      busy: Boolean,
    },
    emits: ['update:open', 'confirm'],
    template:
      '<div v-if="open" data-test="publish-dialog" :data-missing="missingNames.join(\',\')" :data-message="message ?? \'\'"><button data-test="confirm-publish" @click="$emit(\'confirm\')" /></div>',
  }),
}))

const schedule: OfflineSchedule = {
  scheduleId: 's1',
  activityId: 'act',
  subjectName: 'Tafsir',
  classroomName: 'VII A',
  offlineKind: 'WRITTEN',
  maxScore: 50,
  startsAt: '2026-11-30T01:00:00.000Z',
  endsAt: '2026-11-30T02:30:00.000Z',
  registered: 4,
  scored: 1,
  absent: 2,
  missing: 1,
  published: 1,
}

const row = (overrides: Partial<OfflineRosterRow>): OfflineRosterRow => ({
  studentId: 'x',
  participantNumber: null,
  name: null,
  state: 'MISSING',
  rawScore: null,
  note: null,
  publication: null,
  ...overrides,
})

const roster = (): OfflineRosterRow[] => [
  row({
    studentId: 'a',
    participantNumber: '25-001',
    name: 'Ahmad',
    state: 'SCORED',
    rawScore: 40,
    publication: 'SENT',
  }),
  row({
    studentId: 'b',
    participantNumber: '25-002',
    name: 'Budi',
    state: 'ABSENT',
    publication: 'SENT',
  }),
  row({
    studentId: 'e',
    participantNumber: '25-005',
    name: 'Eko',
    state: 'ABSENT',
  }),
  row({ studentId: 'c', participantNumber: '25-003', name: 'Citra' }),
  row({
    studentId: 'f',
    participantNumber: '25-006',
    name: 'Fajar',
    state: 'SCORED',
    rawScore: 30,
    publication: 'FAILED',
  }),
]

const scoreInputs = (wrapper: VueWrapper) =>
  wrapper.findAll('table input[data-score-input]')

const statusOf = (wrapper: VueWrapper, name: string) =>
  wrapper
    .findAll('table tbody tr')
    .find((tr) => tr.text().includes(name))!
    .get('[data-test="row-status"]')
    .text()

async function mountView() {
  const wrapper = mount(OfflineScoreEntryView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
  permissions.clear()
  permissions.add('exam-grading.read')
  permissions.add('exam-grading.grade')
  service.loadSchedules.mockResolvedValue({ success: true, data: [schedule] })
  service.loadRoster.mockResolvedValue({ success: true, data: roster() })
  service.save.mockImplementation(
    (_id: string, studentId: string, body: { rawScore: number | null }) =>
      Promise.resolve({
        success: true,
        data: {
          ...roster().find((item) => item.studentId === studentId)!,
          state: 'SCORED',
          rawScore: body.rawScore,
          publication: null,
        },
      }),
  )
  service.downloadSheet.mockResolvedValue(true)
})

describe('OfflineScoreEntryView', () => {
  it('shows the exam header with its kind and maximum', async () => {
    const wrapper = await mountView()
    const summary = wrapper.get('[data-test="summary"]').text()
    expect(summary).toContain('Tafsir')
    expect(summary).toContain('VII A')
    expect(summary).toContain('Written')
    expect(summary).toContain('50')
  })

  it('shows the state of every student in words', async () => {
    const wrapper = await mountView()
    expect(statusOf(wrapper, 'Ahmad')).toBe('Dinilai · Terkirim')
    expect(statusOf(wrapper, 'Eko')).toBe('Tidak hadir')
    expect(statusOf(wrapper, 'Citra')).toBe('Belum dinilai')
    expect(statusOf(wrapper, 'Fajar')).toBe('Dinilai · Gagal')
  })

  it('locks the score of absent students and warns about one already sent', async () => {
    const wrapper = await mountView()
    const inputs = scoreInputs(wrapper)
    expect(
      inputs.map((input) => input.attributes('disabled') !== undefined),
    ).toEqual([false, true, true, false, false])
    expect(inputs[0].attributes('aria-label')).toBe('Nilai Ahmad')
    const warning = wrapper.get('[data-test="sent-absent-warning"]')
    expect(warning.text()).toContain(
      'Nilai sudah terkirim ke penilaian sebelum siswa ditandai tidak hadir; perbaiki di penilaian',
    )
    expect(warning.text()).toContain('Budi')
    expect(warning.text()).not.toContain('Eko')
  })

  it('saves a typed score on blur', async () => {
    const wrapper = await mountView()
    const input = scoreInputs(wrapper)[3]
    await input.setValue('45')
    await input.trigger('blur')
    await vi.waitFor(() =>
      expect(service.save).toHaveBeenCalledWith('s1', 'c', { rawScore: 45 }),
    )
    await flushPromises()
    expect(statusOf(wrapper, 'Citra')).toContain('Tersimpan')
  })

  it('flags an invalid score inline and does not send it', async () => {
    const wrapper = await mountView()
    const input = scoreInputs(wrapper)[3]
    await input.setValue('abc')
    await input.trigger('blur')
    await flushPromises()
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Nilai harus berupa angka')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(service.save).not.toHaveBeenCalled()
  })

  it('moves to the next student that can be scored on Enter', async () => {
    const wrapper = await mountView()
    const inputs = scoreInputs(wrapper)
    ;(inputs[0].element as HTMLInputElement).focus()
    await inputs[0].trigger('keydown', { key: 'Enter' })
    expect(document.activeElement).toBe(inputs[3].element)
  })

  it('fills the next rows from a pasted column and says what was skipped', async () => {
    const wrapper = await mountView()
    const input = scoreInputs(wrapper)[0]
    await input.trigger('paste', {
      clipboardData: { getData: () => '41\nTIDAK HADIR\nTIDAK HADIR\n42\n43' },
    })
    await flushPromises()
    const values = scoreInputs(wrapper).map(
      (item) => (item.element as HTMLInputElement).value,
    )
    expect(values).toEqual(['41', '', '', '42', '43'])
    expect(wrapper.get('[data-test="paste-summary"]').text()).toBe(
      '3 nilai ditempel, 2 baris bukan angka dilewati.',
    )
    await vi.waitFor(() => expect(service.save).toHaveBeenCalledTimes(3))
  })

  it('downloads the score sheet of the schedule', async () => {
    const wrapper = await mountView()
    const download = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Unduh lembar nilai (.xlsx)')!
    await download.trigger('click')
    expect(service.downloadSheet).toHaveBeenCalledWith('s1')
  })

  it('opens the import dialog and reloads the roster after an import', async () => {
    const wrapper = await mountView()
    await wrapper
      .findAll('button')
      .find((item) => item.text() === 'Impor nilai')!
      .trigger('click')
    const dialog = wrapper.get('[data-test="import-dialog"]')
    expect(dialog.attributes('data-schedule')).toBe('s1')
    expect(service.loadRoster).toHaveBeenCalledTimes(1)
    await wrapper.get('[data-test="imported"]').trigger('click')
    await flushPromises()
    expect(service.loadRoster).toHaveBeenCalledTimes(2)
  })

  it('is read-only without the grading permission', async () => {
    permissions.delete('exam-grading.grade')
    const wrapper = await mountView()
    expect(
      scoreInputs(wrapper).every(
        (input) => input.attributes('disabled') !== undefined,
      ),
    ).toBe(true)
    const labels = wrapper.findAll('button').map((item) => item.text())
    expect(labels).toContain('Unduh lembar nilai (.xlsx)')
    expect(labels).not.toContain('Impor nilai')
    expect(labels).not.toContain('Kirim ke penilaian')
  })

  const publishButton = (wrapper: VueWrapper) =>
    wrapper
      .findAll('button')
      .find((item) => item.text() === 'Kirim ke penilaian')!

  it('names the students left out and sends with their exclusion confirmed', async () => {
    service.publish.mockResolvedValue({
      success: true,
      data: { queued: 2, missing: 1, absent: 2 },
    })
    const wrapper = await mountView()
    await publishButton(wrapper).trigger('click')
    const dialog = wrapper.get('[data-test="publish-dialog"]')
    expect(dialog.attributes('data-missing')).toBe('Citra')
    await wrapper.get('[data-test="confirm-publish"]').trigger('click')
    await flushPromises()
    expect(service.publish).toHaveBeenCalledWith('s1', true)
    expect(wrapper.find('[data-test="publish-dialog"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="publish-result"]').text()).toBe(
      '2 nilai masuk antrean pengiriman ke penilaian; 2 siswa tidak hadir tidak dikirim.',
    )
    expect(service.loadRoster).toHaveBeenCalledTimes(2)
  })

  it('sends without confirming anything when every present student has a score', async () => {
    service.loadRoster.mockResolvedValue({
      success: true,
      data: roster().filter((item) => item.state !== 'MISSING'),
    })
    service.publish.mockResolvedValue({
      success: true,
      data: { queued: 2, missing: 0, absent: 2 },
    })
    const wrapper = await mountView()
    await publishButton(wrapper).trigger('click')
    expect(
      wrapper.get('[data-test="publish-dialog"]').attributes('data-missing'),
    ).toBe('')
    await wrapper.get('[data-test="confirm-publish"]').trigger('click')
    await flushPromises()
    expect(service.publish).toHaveBeenCalledWith('s1', false)
  })

  it('reopens the dialog with the server message when scores went missing meanwhile', async () => {
    service.loadRoster.mockResolvedValueOnce({
      success: true,
      data: roster().filter((item) => item.state !== 'MISSING'),
    })
    service.publish.mockResolvedValue({
      success: false,
      error: 'Belum dinilai: Citra',
      missing: true,
    })
    const wrapper = await mountView()
    await publishButton(wrapper).trigger('click')
    await wrapper.get('[data-test="confirm-publish"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-test="publish-dialog"]')
    expect(dialog.attributes('data-message')).toBe('Belum dinilai: Citra')
    expect(dialog.attributes('data-missing')).toBe('Citra')
  })

  it('cannot send while a row is still being saved', async () => {
    const wrapper = await mountView()
    const input = scoreInputs(wrapper)[3]
    await input.setValue('45')
    await input.trigger('blur')
    expect(publishButton(wrapper).attributes('disabled')).toBeDefined()
    await vi.waitFor(() => expect(service.save).toHaveBeenCalled())
    await flushPromises()
    expect(publishButton(wrapper).attributes('disabled')).toBeUndefined()
  })
})
