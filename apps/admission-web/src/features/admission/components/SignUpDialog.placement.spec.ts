// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SignUpDialog from './SignUpDialog.vue'

const service = vi.hoisted(() => ({ fetchGrades: vi.fn(), register: vi.fn() }))
vi.mock('../services/publicAdmissionService', () => ({
  publicAdmissionService: service,
}))
vi.mock('@/features/platform/auth', () => ({
  authApi: { googleStartUrl: vi.fn() },
  authService: { loginUser: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('vue-router', () => ({
  RouterLink: { template: '<a><slot /></a>' },
  useRouter: () => ({ push: vi.fn() }),
}))

const passthrough = { template: '<div><slot /></div>' }
const selectStubs = {
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

const grades = [{ id: 'g7', level: 7, name: 'Kelas 7' }]

function mountDialog() {
  return mount(SignUpDialog, {
    props: { modelValue: true },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogScrollContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        ...selectStubs,
      },
    },
  })
}

describe('SignUpDialog placement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.fetchGrades.mockResolvedValue(grades)
    service.register.mockResolvedValue({ success: true, data: {} })
  })

  it('loads the grades when it opens and offers the two choices', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(service.fetchGrades).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Jenis Pendaftaran')
    expect(wrapper.findAll('option').map((option) => option.text())).toContain(
      'Kelas 7',
    )
  })

  it('cannot be submitted without the choices', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Ahmad Fauzi')
    await wrapper.get('input[type="email"]').setValue('ahmad@example.com')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Jenis pendaftaran wajib dipilih')
    })
    expect(service.register).not.toHaveBeenCalled()
  })

  it('registers with the type and the grade', async () => {
    const wrapper = mountDialog()
    await flushPromises()
    await wrapper.findAll('input')[0].setValue('Ahmad Fauzi')
    await wrapper.get('input[type="email"]').setValue('ahmad@example.com')
    const passwords = wrapper.findAll('input[type="password"]')
    await passwords[0].setValue('rahasia123')
    await passwords[1].setValue('rahasia123')
    const selects = wrapper.findAll('select')
    await selects[0].setValue('NEW')
    await selects[1].setValue('g7')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(service.register).toHaveBeenCalledWith(
        expect.objectContaining({ admissionType: 'NEW', targetGradeId: 'g7' }),
      )
    })
  })

  it('shows an error with a retry when the grades cannot be loaded, and does not register', async () => {
    service.fetchGrades.mockResolvedValueOnce(null)
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.text()).toContain('Daftar tingkat kelas belum bisa dimuat')
    service.fetchGrades.mockResolvedValue(grades)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Coba lagi')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain(
      'Daftar tingkat kelas belum bisa dimuat',
    )
    expect(wrapper.findAll('option').map((option) => option.text())).toContain(
      'Kelas 7',
    )
  })
})
