// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useExamBankStore } from '@/features/exam-bank/stores/examBankStore'
import PackageCreateDialog from './PackageCreateDialog.vue'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const { create, loadReferences } = vi.hoisted(() => ({
  create: vi.fn(),
  loadReferences: vi.fn(),
}))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { create },
}))
vi.mock('@/features/exam-bank/services/examBankService', () => ({
  examBankService: { loadReferences },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const select = defineComponent({
  name: 'SelectStub',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<div><slot /></div>',
})
const textInput = defineComponent({
  props: { modelValue: String, id: String },
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Input: textInput,
}

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

function open() {
  const store = useExamBankStore()
  store.scope = {
    all: false,
    employeeId: 'e1',
    pairs: [
      {
        subjectId: 'math',
        subjectName: 'Matematika',
        gradeId: 'g7',
        gradeLevel: 7,
        gradeName: null,
      },
    ],
  }
  return mount(PackageCreateDialog, {
    props: { open: true },
    global: { stubs },
  })
}

describe('PackageCreateDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    loadReferences.mockResolvedValue(undefined)
  })

  it('asks for the title, subject and grade', async () => {
    const wrapper = open()
    await flushPromises()

    for (const label of ['Judul', 'Mapel', 'Tingkat']) {
      expect(wrapper.text()).toContain(label)
    }
    wrapper.unmount()
  })

  it('keeps Simpan disabled until the title is filled', async () => {
    const wrapper = open()
    await flushPromises()

    expect(
      buttonByText(wrapper, 'Simpan')!.attributes('disabled'),
    ).toBeDefined()
    await wrapper.find('input').setValue('UAS')
    expect(
      buttonByText(wrapper, 'Simpan')!.attributes('disabled'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('announces the new package and closes', async () => {
    create.mockResolvedValue({ success: true, data: { id: 'p9' } })
    const wrapper = open()
    await flushPromises()
    await wrapper.find('input').setValue('UAS')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('created')).toEqual([['p9']])
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('shows the server message and stays open when refused', async () => {
    create.mockResolvedValue({
      success: false,
      error: 'Mapel bukan ampuan Anda',
    })
    const wrapper = open()
    await flushPromises()
    await wrapper.find('input').setValue('UAS')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Mapel bukan ampuan Anda')
    expect(wrapper.emitted('created')).toBeUndefined()
    wrapper.unmount()
  })
})
