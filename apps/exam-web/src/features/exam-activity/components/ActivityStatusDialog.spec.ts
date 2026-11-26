// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { floatingFieldStub } from '@/test-support/floatingFieldStub'
import ActivityStatusDialog from './ActivityStatusDialog.vue'
import type { ExamActivityRecord } from '../types'

const { updateStatus } = vi.hoisted(() => ({ updateStatus: vi.fn() }))
vi.mock('../api/examActivityApi', () => ({
  examActivityApi: { updateStatus },
}))
vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const item = defineComponent({
  props: { value: String, disabled: Boolean },
  template: '<option :value="value" :disabled="disabled"><slot /></option>',
})

const stubs = {
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  Button: button,
  FloatingField: floatingFieldStub,
  FormControl: passthrough,
  Select: select,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
}

const activity = (
  overrides: Partial<ExamActivityRecord> = {},
): ExamActivityRecord =>
  ({
    id: 'act-1',
    subjectName: 'Matematika',
    packageId: 'pkg-1',
    status: 'SCHEDULED',
    startsAt: '2099-11-10T01:00:00.000Z',
    endsAt: '2099-11-10T03:00:00.000Z',
    ...overrides,
  }) as ExamActivityRecord

const open = (item: ExamActivityRecord) =>
  mount(ActivityStatusDialog, {
    props: { open: true, activity: item },
    global: { stubs },
  })

const submit = async (wrapper: ReturnType<typeof open>) => {
  await wrapper.get('#activity-status-form').trigger('submit')
  await new Promise((resolve) => setTimeout(resolve, 30))
  await flushPromises()
}

describe('ActivityStatusDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves the chosen status and closes', async () => {
    updateStatus.mockResolvedValue(undefined)
    const wrapper = open(activity())
    await wrapper
      .get('[data-field="status"]')
      .findComponent({ name: 'SelectStub' })
      .vm.$emit('update:modelValue', 'ACTIVE')
    await flushPromises()

    await submit(wrapper)

    expect(updateStatus).toHaveBeenCalledWith('act-1', 'ACTIVE')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('proposes Ditutup for an activity whose window has ended', async () => {
    updateStatus.mockResolvedValue(undefined)
    const wrapper = open(
      activity({
        status: 'ACTIVE',
        startsAt: '2020-11-10T01:00:00.000Z',
        endsAt: '2020-11-10T03:00:00.000Z',
      }),
    )

    await submit(wrapper)

    expect(updateStatus).toHaveBeenCalledWith('act-1', 'CLOSED')
    wrapper.unmount()
  })

  it('does not allow activating an online activity without a package, but allows scheduling it', () => {
    const wrapper = open(
      activity({ packageId: null, status: 'DRAFT', deliveryMode: 'ONLINE' }),
    )

    const disabled = wrapper
      .findAll('option')
      .filter((option) => option.attributes('disabled') !== undefined)
      .map((option) => option.attributes('value'))
    expect(disabled).toEqual(['ACTIVE'])
    expect(wrapper.text()).toContain('Pasang paket soal dulu')
    wrapper.unmount()
  })

  it('opens on the preset status and explains sharing without a package', async () => {
    updateStatus.mockResolvedValue(undefined)
    const wrapper = mount(ActivityStatusDialog, {
      props: {
        open: true,
        activity: activity({ packageId: null, status: 'DRAFT' }),
        presetStatus: 'SCHEDULED',
      },
      global: { stubs },
    })

    expect(wrapper.text()).toContain(
      'Jadwal dibagikan tanpa paket soal; ujian baru bisa dibuka setelah paket dipasang',
    )
    await submit(wrapper)
    expect(updateStatus).toHaveBeenCalledWith('act-1', 'SCHEDULED')
    wrapper.unmount()
  })

  it('explains that offline exams are not opened in the app and allows every status', () => {
    const wrapper = open(
      activity({ packageId: null, status: 'DRAFT', deliveryMode: 'OFFLINE' }),
    )

    expect(wrapper.text()).toContain('Ujian offline tidak dibuka di aplikasi')
    const disabled = wrapper
      .findAll('option')
      .filter((option) => option.attributes('disabled') !== undefined)
    expect(disabled).toHaveLength(0)
    wrapper.unmount()
  })

  it('shows the server message when the server refuses ACTIVE for an online activity without a package', async () => {
    updateStatus.mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'Pasang paket soal sebelum membuka ujian' },
      },
    })
    const wrapper = open(activity({ packageId: null, status: 'SCHEDULED' }))
    await wrapper
      .get('[data-field="status"]')
      .findComponent({ name: 'SelectStub' })
      .vm.$emit('update:modelValue', 'ACTIVE')
    await flushPromises()
    await submit(wrapper)

    expect(updateStatus).toHaveBeenCalledWith('act-1', 'ACTIVE')
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Pasang paket soal sebelum membuka ujian',
    )
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('warns before stopping a running activity', async () => {
    const wrapper = open(activity({ status: 'ACTIVE' }))
    await wrapper
      .get('[data-field="status"]')
      .findComponent({ name: 'SelectStub' })
      .vm.$emit('update:modelValue', 'CLOSED')
    await flushPromises()

    expect(wrapper.text()).toContain('mengumpulkan sesi yang masih berjalan')
    wrapper.unmount()
  })

  it('shows the server message when saving fails and stays open', async () => {
    updateStatus.mockRejectedValue({
      response: { data: { message: 'Pasang paket soal dulu' } },
    })
    const wrapper = open(activity())

    await submit(wrapper)

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    wrapper.unmount()
  })
})
