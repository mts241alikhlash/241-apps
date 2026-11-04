// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  RouterLink: defineComponent({ template: '<a><slot /></a>' }),
}))

vi.mock('@/features/platform/auth', () => ({
  authService: { loginUser: vi.fn().mockResolvedValue({}) },
  authApi: { googleStartUrl: vi.fn() },
}))

vi.mock('../services/publicAdmissionService', () => ({
  publicAdmissionService: { register: vi.fn(), fetchGrades: vi.fn() },
}))

import { authService, authApi } from '@/features/platform/auth'
import { publicAdmissionService } from '../services/publicAdmissionService'
import SignUpDialog from './SignUpDialog.vue'

const passthrough = { template: '<div><slot /></div>' }

const stubs = {
  Dialog: passthrough,
  DialogScrollContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  Select: {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="" /><slot /></select>',
  },
  SelectTrigger: { template: '<span />' },
  SelectValue: { template: '<span />' },
  SelectContent: { template: '<slot />' },
  SelectItem: {
    props: ['value'],
    template: '<option :value="value"><slot /></option>',
  },
}

function mountDialog() {
  return mount(SignUpDialog, {
    props: { modelValue: true },
    global: { stubs },
  })
}

async function fillValidForm(wrapper: VueWrapper) {
  const inputs = wrapper.findAll('input')
  await inputs[0]?.setValue('Budi Santoso')
  await inputs[1]?.setValue('budi@example.com')
  await inputs[2]?.setValue('password123')
  await inputs[3]?.setValue('password123')
  const selects = wrapper.findAll('select')
  await selects[0]?.setValue('NEW')
  await selects[1]?.setValue('g7')
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('SignUpDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(publicAdmissionService.fetchGrades).mockResolvedValue([
      { id: 'g7', level: 7, name: 'Kelas 7' },
    ] as never)
  })

  it('renders the four account fields and the two placement choices, with no phone and no wave', () => {
    const wrapper = mountDialog()

    expect(wrapper.findAll('input')).toHaveLength(4)
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.find('input[name="fullName"]').exists()).toBe(true)
    expect(wrapper.find('input[name="email"]').exists()).toBe(true)
    expect(wrapper.find('input[name="password"]').exists()).toBe(true)
    expect(wrapper.find('input[name="passwordConfirm"]').exists()).toBe(true)
    expect(wrapper.find('input[name="phone"]').exists()).toBe(false)
    expect(wrapper.find('input[name="waveId"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No. HP')
    expect(wrapper.text()).not.toContain('Gelombang')
  })

  it('reports the password visibility state through aria-pressed', async () => {
    const wrapper = mountDialog()

    const toggles = wrapper.findAll('button[aria-pressed]')
    expect(toggles).toHaveLength(2)
    expect(toggles[0]?.attributes('aria-pressed')).toBe('false')

    await toggles[0]?.trigger('click')

    expect(toggles[0]?.attributes('aria-pressed')).toBe('true')
  })

  it('links every field label and validation description to its input', async () => {
    const wrapper = mountDialog()
    for (const input of wrapper.findAll('input')) {
      const id = input.attributes('id')
      expect(id).toBeTruthy()
      expect(wrapper.find(`label[for="${id}"]`).exists()).toBe(true)
      expect(input.attributes('aria-describedby')).toBeTruthy()
    }
    await submit(wrapper)
    await vi.waitFor(() => {
      expect(
        wrapper.get('input[name="password"]').attributes('aria-invalid'),
      ).toBe('true')
      expect(
        wrapper.get('input[name="passwordConfirm"]').attributes('aria-invalid'),
      ).toBe('true')
    })
  })

  it('attaches a 409 conflict to the email field and keeps the dialog open', async () => {
    vi.mocked(publicAdmissionService.register).mockResolvedValue({
      success: false,
      status: 409,
      outage: false,
      error: 'Email is already registered. Sign in instead.',
    })

    const wrapper = mountDialog()
    await fillValidForm(wrapper)
    await submit(wrapper)

    await vi.waitFor(() => {
      expect(
        wrapper.find('input[name="email"]').attributes('aria-invalid'),
      ).toBe('true')
    })
    expect(wrapper.text()).toContain('Email ini sudah terdaftar')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('shows a dialog-level message for a 400 and keeps submit available', async () => {
    vi.mocked(publicAdmissionService.register).mockResolvedValue({
      success: false,
      status: 400,
      outage: false,
      error: 'registration is not open',
    })

    const wrapper = mountDialog()
    await fillValidForm(wrapper)
    await submit(wrapper)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Pendaftaran sedang tidak dibuka')
    })
    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeUndefined()
  })

  it('closes and navigates to the form after a successful sign-up', async () => {
    vi.mocked(publicAdmissionService.register).mockResolvedValue({
      success: true,
      data: {
        id: 'app-1',
        registrationNumber: 'PSB2026-0001',
        identifier: 'budi@example.com',
      },
    })

    const wrapper = mountDialog()
    await fillValidForm(wrapper)
    await submit(wrapper)

    await vi.waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({ name: 'applicant-form' })
    })
    expect(authService.loginUser).toHaveBeenCalledWith({
      identifier: 'budi@example.com',
      password: 'password123',
    })
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('starts the Google flow with the signup intent', async () => {
    const wrapper = mountDialog()
    const origin = window.location.origin

    const googleButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Daftar dengan Google'))

    await googleButton?.trigger('click')

    expect(authApi.googleStartUrl).toHaveBeenCalledWith(origin, 'signup')
  })
})
