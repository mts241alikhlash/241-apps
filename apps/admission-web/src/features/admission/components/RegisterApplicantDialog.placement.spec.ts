// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RegisterApplicantDialog from './RegisterApplicantDialog.vue'

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

const waves = [{ id: 'w1', name: 'Gelombang 1', remainingQuota: 5 }]
const grades = [
  { id: 'g7', level: 7, name: 'Kelas 7' },
  { id: 'g8', level: 8, name: 'Kelas 8' },
]

function mountDialog() {
  return mount(RegisterApplicantDialog, {
    props: {
      open: true,
      waves: waves as never,
      grades,
      isSubmitting: false,
      errorMessage: null,
    },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        ScrollArea: passthrough,
        ...selectStubs,
      },
    },
  })
}

async function fillAccount(wrapper: ReturnType<typeof mountDialog>) {
  const inputs = wrapper.findAll('input')
  const byType = (type: string) =>
    inputs.filter((input) => input.attributes('type') === type)
  await inputs[0].setValue('Ahmad Fauzi')
  await byType('email')[0].setValue('ahmad@example.com')
  const passwords = byType('password')
  await passwords[0].setValue('rahasia123')
  await passwords[1].setValue('rahasia123')
  const selects = wrapper.findAll('select')
  await selects[0].setValue('w1')
  return selects
}

describe('RegisterApplicantDialog placement', () => {
  it('offers the two choices and lists the grades', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.text()).toContain('Jenis Pendaftaran')
    expect(wrapper.text()).toContain('Tingkat Kelas yang Dituju')
    const options = wrapper.findAll('option').map((option) => option.text())
    expect(options).toEqual(
      expect.arrayContaining(['Siswa baru', 'Pindahan', 'Kelas 7', 'Kelas 8']),
    )
  })

  it('does not submit without the two choices', async () => {
    const wrapper = mountDialog()
    await fillAccount(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Jenis pendaftaran wajib dipilih')
      expect(wrapper.text()).toContain('Tingkat kelas wajib dipilih')
    })
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('sends the type and the grade with the account', async () => {
    const wrapper = mountDialog()
    const selects = await fillAccount(wrapper)
    await selects[1].setValue('TRANSFER')
    await selects[2].setValue('g8')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
        waveId: 'w1',
        admissionType: 'TRANSFER',
        targetGradeId: 'g8',
      })
    })
  })
})
