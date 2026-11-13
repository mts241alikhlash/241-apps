// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SessionRecoveryDialog from './SessionRecoveryDialog.vue'
import type { RecoveryAction } from '../types'

const { releaseSession, reopenSession, resetSession, extendTime, allowLate } =
  vi.hoisted(() => ({
    releaseSession: vi.fn(),
    reopenSession: vi.fn(),
    resetSession: vi.fn(),
    extendTime: vi.fn(),
    allowLate: vi.fn(),
  }))
vi.mock('../services/examRoomService', () => ({
  examRoomService: {
    releaseSession,
    reopenSession,
    resetSession,
    extendTime,
    allowLate,
  },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const textarea = defineComponent({
  props: { modelValue: String, id: String },
  emits: ['update:modelValue'],
  template:
    '<textarea :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const input = defineComponent({
  props: { modelValue: Number, id: String },
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
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
  FloatingLabelField: field,
  Textarea: textarea,
  Input: input,
}

const open = (action: RecoveryAction, props: Record<string, unknown> = {}) =>
  mount(SessionRecoveryDialog, {
    props: {
      open: true,
      roomId: 'r1',
      studentId: 'st1',
      studentName: 'Ahmad Fauzi',
      sessionId: 'x1',
      action,
      ...props,
    },
    global: { stubs },
  })

async function confirm(host: ReturnType<typeof open>, reason: string) {
  await host.find('textarea').setValue(reason)
  const save = host.findAll('button').find((item) => item.text() === 'Simpan')
  await save!.trigger('click')
  await flushPromises()
}

describe('SessionRecoveryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    releaseSession.mockResolvedValue(true)
    reopenSession.mockResolvedValue(true)
    resetSession.mockResolvedValue(true)
    extendTime.mockResolvedValue(true)
    allowLate.mockResolvedValue(true)
  })

  it('releases the device with the typed reason', async () => {
    const wrapper = open('release')
    await confirm(wrapper, 'Layar siswa pecah')

    expect(releaseSession).toHaveBeenCalledWith('x1', 'Layar siswa pecah')
    expect(reopenSession).not.toHaveBeenCalled()
    expect(wrapper.emitted('done')).toHaveLength(1)
    wrapper.unmount()
  })

  it('reopens the session with the typed reason', async () => {
    const wrapper = open('reopen')
    await confirm(wrapper, 'Terkirim tidak sengaja')

    expect(reopenSession).toHaveBeenCalledWith('x1', 'Terkirim tidak sengaja')
    expect(releaseSession).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('resets the session with the typed reason', async () => {
    const wrapper = open('reset')
    await confirm(wrapper, 'Aplikasi macet total')

    expect(resetSession).toHaveBeenCalledWith('x1', 'Aplikasi macet total')
    wrapper.unmount()
  })

  it('extends the time with the chosen minutes and the reason', async () => {
    const wrapper = open('extend-time')
    await wrapper.find('input').setValue('15')
    await confirm(wrapper, 'Listrik padam sepuluh menit')

    expect(extendTime).toHaveBeenCalledWith(
      'x1',
      15,
      'Listrik padam sepuluh menit',
    )
    wrapper.unmount()
  })

  it('allows the late entry against the room', async () => {
    const late = open('allow-late')
    await confirm(late, 'Terjebak banjir di jalan')
    expect(allowLate).toHaveBeenCalledWith(
      'r1',
      'st1',
      'Terjebak banjir di jalan',
    )
    late.unmount()
  })

  it('disables extending when the exam window is over', async () => {
    const wrapper = open('extend-time', { maxExtendMinutes: 0 })
    await wrapper.find('textarea').setValue('Listrik padam')

    const save = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Simpan')!
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(save.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Jendela ujian sudah habis')
    wrapper.unmount()
  })

  it('caps the minutes input at the remaining window', () => {
    const wrapper = open('extend-time', { maxExtendMinutes: 45 })

    expect(wrapper.find('input').attributes('max')).toBe('45')
    expect(wrapper.text()).not.toContain('Jendela ujian sudah habis')
    wrapper.unmount()
  })

  it('caps the minutes input at the per-request limit', () => {
    const wrapper = open('extend-time', { maxExtendMinutes: 150 })

    expect(wrapper.find('input').attributes('max')).toBe('120')
    wrapper.unmount()
  })

  it('disables reopening when the exam window is closed', async () => {
    const wrapper = open('reopen', { windowOpen: false })
    await wrapper.find('textarea').setValue('Terkirim tidak sengaja')

    const save = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Simpan')!
    expect(save.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Jendela ujian sudah habis')
    await confirm(wrapper, 'Terkirim tidak sengaja')
    expect(reopenSession).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('refuses to submit without a reason of five characters', async () => {
    const wrapper = open('release')
    const save = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Simpan')!

    expect(save.attributes('disabled')).toBeDefined()
    await confirm(wrapper, 'ok')
    expect(releaseSession).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows the server refusal instead of closing', async () => {
    releaseSession.mockResolvedValue(false)
    const wrapper = open('release')
    await confirm(wrapper, 'Layar siswa pecah')

    expect(wrapper.text()).toContain('Tindakan ditolak server.')
    expect(wrapper.emitted('done')).toBeUndefined()
    wrapper.unmount()
  })
})
