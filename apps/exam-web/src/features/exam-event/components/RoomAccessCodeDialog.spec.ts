// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RoomAccessCodeDialog from './RoomAccessCodeDialog.vue'

const { loadAccessCode, rotateToken } = vi.hoisted(() => ({
  loadAccessCode: vi.fn(),
  rotateToken: vi.fn(),
}))
vi.mock('../services/examEventService', () => ({
  examEventService: { loadAccessCode, rotateToken },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const alert = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open" data-alert><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\', { preventDefault() {} })"><slot /></button>',
})

const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const textArea = defineComponent({
  props: { modelValue: String, id: String },
  emits: ['update:modelValue'],
  template:
    '<textarea :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})

const stubs = {
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  AlertDialog: alert,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
  Button: button,
  FloatingLabelField: field,
  Textarea: textArea,
}

const open = (props: Record<string, unknown> = {}) =>
  mount(RoomAccessCodeDialog, {
    props: { open: true, roomId: 'r1', roomName: 'R01 · Ruang 01', ...props },
    global: { stubs },
  })

const buttonByText = (host: ReturnType<typeof open>, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

describe('RoomAccessCodeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadAccessCode.mockResolvedValue({
      success: true,
      data: {
        accessCode: 'ABC123',
        rotation: 4,
        expiresAt: '2026-11-02T01:10:00.000Z',
      },
    })
    rotateToken.mockResolvedValue({
      success: true,
      data: {
        accessCode: 'NEW999',
        rotation: 5,
        expiresAt: '2026-11-02T01:20:00.000Z',
      },
    })
  })

  it('shows the active token to a supervisor', async () => {
    const wrapper = open()
    await flushPromises()

    expect(loadAccessCode).toHaveBeenCalledWith('r1')
    expect(wrapper.text()).toContain('ABC123')
    expect(buttonByText(wrapper, 'Putar Token')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers the rotate control when the action is rotate', async () => {
    const wrapper = open({ action: 'rotate', canRotate: true })
    await flushPromises()

    expect(loadAccessCode).not.toHaveBeenCalled()
    expect(buttonByText(wrapper, 'Putar Token')).toBeDefined()
    wrapper.unmount()
  })

  it('rotates the token and shows the new code', async () => {
    const wrapper = open({ action: 'rotate', canRotate: true })
    await flushPromises()

    await buttonByText(wrapper, 'Putar Token')!.trigger('click')
    await flushPromises()
    await wrapper.find('textarea').setValue('Token bocor ke siswa lain')
    const confirm = wrapper
      .findAll('button')
      .find((candidate) => candidate.text() === 'Putar')
    await confirm!.trigger('click')
    await flushPromises()

    expect(rotateToken).toHaveBeenCalledWith('r1', 'Token bocor ke siswa lain')
    expect(wrapper.text()).toContain('NEW999')
    wrapper.unmount()
  })

  it('keeps the rotate control away from a read-only supervisor', async () => {
    const wrapper = open({ canRotate: false })
    await flushPromises()

    expect(buttonByText(wrapper, 'Putar Token')).toBeUndefined()
    wrapper.unmount()
  })
})
