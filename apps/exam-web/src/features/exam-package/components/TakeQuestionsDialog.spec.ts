// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TakeQuestionsDialog from './TakeQuestionsDialog.vue'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const { loadApprovedSources, loadPackage, take } = vi.hoisted(() => ({
  loadApprovedSources: vi.fn(),
  loadPackage: vi.fn(),
  take: vi.fn(),
}))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { loadApprovedSources, loadPackage, take },
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
const checkbox = defineComponent({
  name: 'CheckboxStub',
  props: { modelValue: Boolean },
  emits: ['update:modelValue'],
  template:
    '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
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
  Badge: passthrough,
  FloatingLabelField: field,
  Select: select,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  Checkbox: checkbox,
}

const items = ['Satu', 'Dua', 'Tiga'].map((summary, index) => ({
  questionId: `q${index + 1}`,
  questionVersion: 1,
  position: index + 1,
  type: 'TRUE_FALSE' as const,
  marker: 'NEW' as const,
  summary,
  points: 2,
}))

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text().startsWith(text))

async function open() {
  const wrapper = mount(TakeQuestionsDialog, {
    props: { open: true, packageId: 'p1', subjectId: 'math', gradeId: 'g7' },
    global: { stubs },
  })
  await flushPromises()
  const selectStub = wrapper.findComponent({ name: 'SelectStub' })
  ;(
    selectStub.vm as unknown as {
      $emit: (event: string, value: string) => void
    }
  ).$emit('update:modelValue', 'p2')
  await flushPromises()
  return wrapper
}

describe('TakeQuestionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadApprovedSources.mockResolvedValue([{ id: 'p2', title: 'Bank UAS' }])
    loadPackage.mockResolvedValue({ id: 'p2', items })
  })

  it('lists the questions of the chosen package', async () => {
    const wrapper = await open()

    for (const summary of ['Satu', 'Dua', 'Tiga']) {
      expect(wrapper.text()).toContain(summary)
    }
    wrapper.unmount()
  })

  it('keeps the copy button disabled until a question is chosen, then counts them', async () => {
    const wrapper = await open()
    expect(
      buttonByText(wrapper, 'Salin soal')!.attributes('disabled'),
    ).toBeDefined()

    await wrapper.findAll('input[type="checkbox"]')[0].setValue(true)
    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)

    expect(buttonByText(wrapper, 'Salin soal')!.text()).toBe('Salin soal (2)')
    expect(
      buttonByText(wrapper, 'Salin soal')!.attributes('disabled'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('selects every question with Pilih semua', async () => {
    const wrapper = await open()

    await buttonByText(wrapper, 'Pilih semua')!.trigger('click')

    expect(buttonByText(wrapper, 'Salin soal')!.text()).toBe('Salin soal (3)')
    wrapper.unmount()
  })

  it('copies, announces and closes', async () => {
    take.mockResolvedValue({ success: true, data: { id: 'p1' } })
    const wrapper = await open()
    await buttonByText(wrapper, 'Pilih semua')!.trigger('click')

    await buttonByText(wrapper, 'Salin soal')!.trigger('click')
    await flushPromises()

    expect(take).toHaveBeenCalledWith('p1', {
      sourcePackageId: 'p2',
      questionIds: ['q1', 'q2', 'q3'],
    })
    expect(wrapper.emitted('taken')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('shows the server message and stays open when refused', async () => {
    take.mockResolvedValue({
      success: false,
      error: 'Paket asal belum disetujui',
    })
    const wrapper = await open()
    await buttonByText(wrapper, 'Pilih semua')!.trigger('click')

    await buttonByText(wrapper, 'Salin soal')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paket asal belum disetujui')
    expect(wrapper.emitted('taken')).toBeUndefined()
    wrapper.unmount()
  })

  it('says so when there is no other package to take from', async () => {
    loadApprovedSources.mockResolvedValue([])
    const wrapper = mount(TakeQuestionsDialog, {
      props: { open: true, packageId: 'p1', subjectId: 'math', gradeId: 'g7' },
      global: { stubs },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Belum ada paket lain yang disetujui')
    wrapper.unmount()
  })
})
