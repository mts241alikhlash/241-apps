// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import PresetSettingsView from './PresetSettingsView.vue'
import { routes } from '@/app/providers/router/routes'

const { listPresets, updatePreset } = vi.hoisted(() => ({
  listPresets: vi.fn(),
  updatePreset: vi.fn(),
}))

vi.mock('../api/examPresetApi', () => ({
  examPresetApi: {
    list: listPresets,
    update: updatePreset,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})

const stubs = {
  Button: button,
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  CardFooter: passthrough,
}

const samplePresets = [
  {
    type: 'DAILY' as const,
    category: 'NON_EXAM' as const,
    updatedAt: '2026-11-11T00:00:00.000Z',
    policy: {
      violationLimit: 5,
      focusThresholdMs: 20000,
      snapshotIntervalMs: 60000,
      heartbeatIntervalMs: 30000,
      gapRecordedMs: 60000,
      gapTokenMs: 600000,
      gapViolationFrom: 3,
      tokenSlotSeconds: 900,
    },
  },
  {
    type: 'ASSIGNMENT' as const,
    category: 'NON_EXAM' as const,
    updatedAt: '2026-11-11T00:00:00.000Z',
    policy: {
      violationLimit: 10,
      focusThresholdMs: 30000,
      snapshotIntervalMs: 120000,
      heartbeatIntervalMs: 60000,
      gapRecordedMs: 120000,
      gapTokenMs: 1800000,
      gapViolationFrom: 5,
      tokenSlotSeconds: 1800,
    },
  },
  {
    type: 'MIDTERM' as const,
    category: 'EXAM' as const,
    updatedAt: '2026-11-11T00:00:00.000Z',
    policy: {
      violationLimit: 3,
      focusThresholdMs: 15000,
      snapshotIntervalMs: 30000,
      heartbeatIntervalMs: 30000,
      gapRecordedMs: 60000,
      gapTokenMs: 300000,
      gapViolationFrom: 2,
      tokenSlotSeconds: 900,
    },
  },
  {
    type: 'FINAL' as const,
    category: 'EXAM' as const,
    updatedAt: '2026-11-11T00:00:00.000Z',
    policy: {
      violationLimit: 3,
      focusThresholdMs: 10000,
      snapshotIntervalMs: 20000,
      heartbeatIntervalMs: 20000,
      gapRecordedMs: 60000,
      gapTokenMs: 180000,
      gapViolationFrom: 1,
      tokenSlotSeconds: 600,
    },
  },
]

describe('PresetSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listPresets.mockResolvedValue({ data: { data: samplePresets } })
  })

  it('renders 4 presets with type labels and the note "Berlaku untuk kegiatan baru"', async () => {
    const wrapper = mount(PresetSettingsView, { global: { stubs } })
    await flushPromises()

    expect(listPresets).toHaveBeenCalled()
    const text = wrapper.text()
    expect(text).toContain('Ulangan Harian')
    expect(text).toContain('Tugas')
    expect(text).toContain('UTS')
    expect(text).toContain('UAS')
    expect(text).toContain('Berlaku untuk kegiatan baru')
    wrapper.unmount()
  })

  it('calls PATCH /exam-policy-presets/{type} when saving a preset', async () => {
    updatePreset.mockResolvedValue({
      data: {
        data: {
          ...samplePresets[2],
          policy: { ...samplePresets[2].policy, violationLimit: 4 },
        },
      },
    })
    const wrapper = mount(PresetSettingsView, { global: { stubs } })
    await flushPromises()

    const saveBtn = wrapper.get('[data-test="save-preset-MIDTERM"]')
    await saveBtn.trigger('click')
    await flushPromises()

    expect(updatePreset).toHaveBeenCalledWith(
      'MIDTERM',
      expect.objectContaining({
        violationLimit: 3,
        focusThresholdMs: 15000,
      }),
    )
    wrapper.unmount()
  })

  it('requires exam-schedules.manage-all on /settings/presets', () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    const resolved = router.resolve('/settings/presets')
    expect(resolved.meta.requiredPermission).toBe('exam-schedules.manage-all')
  })
})
