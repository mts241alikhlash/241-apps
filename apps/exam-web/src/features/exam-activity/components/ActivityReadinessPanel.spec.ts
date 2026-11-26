// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ActivityReadinessPanel from './ActivityReadinessPanel.vue'

const { readiness } = vi.hoisted(() => ({ readiness: vi.fn() }))
vi.mock('../api/examActivityApi', () => ({ examActivityApi: { readiness } }))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})
const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  Button: button,
}

const row = {
  activityId: 'a1',
  subjectName: 'Matematika',
  gradeName: 'Kelas 7',
  startsAt: '2026-11-27T01:00:00.000Z',
  deliveryMode: 'ONLINE',
  checks: [
    { key: 'PACKAGE', ok: true, detail: 'Paket terpasang' },
    { key: 'SEATS', ok: false, detail: 'Kursi belum dibagi' },
  ],
}

const mountPanel = () =>
  mount(ActivityReadinessPanel, {
    props: { eventId: 'ev-1', date: '2026-11-27' },
    global: { stubs },
  })

describe('ActivityReadinessPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches the readiness of the day', async () => {
    readiness.mockResolvedValue([row])
    const wrapper = mountPanel()
    await flushPromises()

    expect(readiness).toHaveBeenCalledWith({
      eventId: 'ev-1',
      date: '2026-11-27',
    })
    wrapper.unmount()
  })

  it('shows ok checks as ready and failing checks as not ready, in text', async () => {
    readiness.mockResolvedValue([row])
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('Matematika')
    expect(wrapper.findAll('[data-check]')).toHaveLength(2)
    const ok = wrapper.get('[data-check="PACKAGE"]')
    const failing = wrapper.get('[data-check="SEATS"]')
    expect(ok.attributes('data-ok')).toBe('true')
    expect(ok.text()).toContain('Siap')
    expect(ok.text()).toContain('Paket terpasang')
    expect(failing.attributes('data-ok')).toBe('false')
    expect(failing.text()).toContain('Belum siap')
    expect(failing.text()).toContain('Kursi belum dibagi')
    wrapper.unmount()
  })

  it('flags an activity with a failing check', async () => {
    readiness.mockResolvedValue([row])
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.get('[data-activity="a1"]').text()).toContain(
      '1 pemeriksaan belum siap',
    )
    wrapper.unmount()
  })

  it('shows the loading state', () => {
    readiness.mockReturnValue(new Promise(vi.fn()))
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('Memuat kesiapan')
    wrapper.unmount()
  })

  it('shows the empty state', async () => {
    readiness.mockResolvedValue([])
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('Tidak ada kegiatan pada hari ini')
    wrapper.unmount()
  })

  it('shows the error and never a success when loading fails, then retries on refresh', async () => {
    readiness.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Gagal memuat kesiapan',
    )
    expect(wrapper.text()).not.toContain('Siap')

    readiness.mockResolvedValue([row])
    await wrapper
      .findAll('button')
      .find((item) => item.text().includes('Segarkan'))!
      .trigger('click')
    await flushPromises()

    expect(readiness).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Matematika')
    wrapper.unmount()
  })

  it('reloads when the date changes', async () => {
    readiness.mockResolvedValue([])
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.setProps({ date: '2026-11-28' })
    await flushPromises()

    expect(readiness).toHaveBeenLastCalledWith({
      eventId: 'ev-1',
      date: '2026-11-28',
    })
    wrapper.unmount()
  })
})
