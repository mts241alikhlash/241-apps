// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ExamCardPanel from './ExamCardPanel.vue'

const { loadSeats } = vi.hoisted(() => ({ loadSeats: vi.fn() }))
vi.mock('../services/examEventService', () => ({
  examEventService: { loadSeats },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button type="button" :disabled="disabled"><slot /></button>',
})
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label>{{ label }}</label><slot /></div>',
})
const select = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<select :value="modelValue"><slot /></select>',
})

const stubs = {
  Button: button,
  FloatingLabelField: field,
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Printer: true,
}

const event = {
  id: 'e1',
  semesterId: 'sem-1',
  name: 'UTS Ganjil',
  type: 'MIDTERM' as const,
  category: 'EXAM' as const,
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-06T09:00:00.000Z',
  lateToleranceMinutes: 30,
  minSubmitMinutes: 20,
  status: 'ACTIVE' as const,
}

const rooms = [
  {
    id: 'r1',
    eventId: 'e1',
    code: 'R01',
    name: 'Ruang 01',
    building: null,
    capacity: 30,
    technicianUserId: null,
    tokenRotation: 0,
  },
]

const mountPanel = (active: boolean) =>
  mount(ExamCardPanel, {
    props: { event, rooms, semesterId: 'sem-1', active },
    global: { stubs },
  })

describe('ExamCardPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadSeats.mockResolvedValue({ success: true, data: [] })
  })

  it('loads nothing while the cards tab has never been opened', async () => {
    const wrapper = mountPanel(false)
    await flushPromises()

    expect(loadSeats).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('loads the first room once the tab becomes active', async () => {
    const wrapper = mountPanel(false)
    await flushPromises()

    await wrapper.setProps({ active: true })
    await flushPromises()

    expect(loadSeats).toHaveBeenCalledWith('r1', 'sem-1')
    wrapper.unmount()
  })

  it('loads only once when the tab is reopened', async () => {
    const wrapper = mountPanel(false)
    await flushPromises()

    await wrapper.setProps({ active: true })
    await flushPromises()
    await wrapper.setProps({ active: false })
    await wrapper.setProps({ active: true })
    await flushPromises()

    expect(loadSeats).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('loads on mount when the panel starts active', async () => {
    const wrapper = mountPanel(true)
    await flushPromises()

    expect(loadSeats).toHaveBeenCalledWith('r1', 'sem-1')
    wrapper.unmount()
  })
})
