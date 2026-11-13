// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SebSettingsView from './SebSettingsView.vue'
import type * as SebModule from '@/shared/seb'
import type { SebProof } from '@/shared/seb'

const { list, create, update, remove, check, isInSeb, readSebProof } =
  vi.hoisted(() => ({
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    check: vi.fn(),
    isInSeb: vi.fn(),
    readSebProof: vi.fn(),
  }))

vi.mock('../api/examSebApi', () => ({
  examSebApi: { list, create, update, remove, check },
}))

vi.mock('@/shared/seb', async (importOriginal) => ({
  ...(await importOriginal<typeof SebModule>()),
  isInSeb,
  readSebProof,
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template:
    '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
})
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const toggle = defineComponent({
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template:
    '<button type="button" role="switch" :aria-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)" />',
})

const stubs = {
  Button: button,
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  Switch: toggle,
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  AlertDialog: dialog,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
}

const sample = [
  {
    id: 'id-1',
    name: 'Ujian Semester',
    configKey: 'abcdef1234567890abcdef1234567890',
    active: true,
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
  },
]

const proof: SebProof = {
  configKeyHash: 'h'.repeat(64),
  pageUrl: 'https://x/my-exams',
}

beforeEach(() => {
  vi.clearAllMocks()
  list.mockResolvedValue(sample)
  isInSeb.mockReturnValue(false)
  readSebProof.mockResolvedValue(proof)
})

describe('SebSettingsView', () => {
  it('lists each configuration with name, first 8 key characters and an active switch', async () => {
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    expect(list).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Ujian Semester')
    expect(wrapper.text()).toContain('abcdef12…')
    expect(wrapper.text()).not.toContain('abcdef1234567890')
    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe(
      'true',
    )
    wrapper.unmount()
  })

  it('adds a configuration from the dialog with name, configKey and file', async () => {
    create.mockResolvedValue(sample[0])
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-test="seb-add"]').trigger('click')
    await wrapper.get('[data-test="seb-name"]').setValue('Ujian Akhir')
    await wrapper.get('[data-test="seb-key"]').setValue('k'.repeat(64))
    const file = new File(['x'], 'ujian.seb')
    const input = wrapper.get('[data-test="seb-file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await wrapper.get('[data-test="seb-submit"]').trigger('click')
    await flushPromises()

    expect(create).toHaveBeenCalledWith({
      name: 'Ujian Akhir',
      configKey: 'k'.repeat(64),
      file,
    })
    wrapper.unmount()
  })

  it('toggles active with a PATCH body of { active }', async () => {
    update.mockResolvedValue({ ...sample[0], active: false })
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[role="switch"]').trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith('id-1', { active: false })
    wrapper.unmount()
  })

  it('asks for confirmation before deleting', async () => {
    remove.mockResolvedValue(undefined)
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-test="seb-delete-id-1"]').trigger('click')
    expect(remove).not.toHaveBeenCalled()

    await wrapper.get('[data-test="seb-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(remove).toHaveBeenCalledWith('id-1')
    wrapper.unmount()
  })

  it('tells the admin to open the page from SEB when the test runs outside SEB', async () => {
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-test="seb-test"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Buka halaman ini dari Safe Exam Browser.')
    expect(check).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('checks the proof inside SEB and shows the matched configuration name', async () => {
    isInSeb.mockReturnValue(true)
    check.mockResolvedValue({ matched: true, configName: 'Ujian Semester' })
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-test="seb-test"]').trigger('click')
    await flushPromises()

    expect(check).toHaveBeenCalledWith({ seb: proof })
    expect(wrapper.text()).toContain('Ujian Semester')
    wrapper.unmount()
  })

  it('shows the no-match message when inside SEB nothing matches', async () => {
    isInSeb.mockReturnValue(true)
    check.mockResolvedValue({ matched: false, configName: null })
    const wrapper = mount(SebSettingsView, { global: { stubs } })
    await flushPromises()

    await wrapper.get('[data-test="seb-test"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Tidak cocok dengan konfigurasi aktif mana pun.',
    )
    wrapper.unmount()
  })
})
