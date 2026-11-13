// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { activeSebConfigs } = vi.hoisted(() => ({ activeSebConfigs: vi.fn() }))

vi.mock('../api/studentExamApi', () => ({
  studentExamApi: { activeSebConfigs },
}))

import SebRequiredView from './SebRequiredView.vue'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SebRequiredView', () => {
  it('lists active configurations with a sebs link', async () => {
    activeSebConfigs.mockResolvedValue([{ id: 'c1', name: 'Ujian Semester' }])

    const wrapper = mount(SebRequiredView)
    await flushPromises()

    expect(wrapper.text()).toContain('Ujian Semester')
    expect(
      wrapper
        .find(
          `a[href="sebs://${window.location.host}/public/seb-configs/c1/file"]`,
        )
        .exists(),
    ).toBe(true)
  })

  it('shows the download links and the Android line', async () => {
    activeSebConfigs.mockResolvedValue([])

    const wrapper = mount(SebRequiredView)
    await flushPromises()

    expect(wrapper.text()).toContain('Windows')
    expect(wrapper.text()).toContain('macOS')
    expect(wrapper.text()).toContain('iOS')
    expect(wrapper.text()).toContain('Istiqra')
  })

  it('says so when no configuration is active', async () => {
    activeSebConfigs.mockResolvedValue([])

    const wrapper = mount(SebRequiredView)
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Belum ada konfigurasi Safe Exam Browser yang aktif.',
    )
  })

  it('shows an alert when the configurations fail to load', async () => {
    activeSebConfigs.mockRejectedValue(new Error('down'))

    const wrapper = mount(SebRequiredView)
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })
})
