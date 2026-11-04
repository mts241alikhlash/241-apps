// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AdjustKeyDialog from './AdjustKeyDialog.vue'

type Wrapper = Pick<VueWrapper, 'findAll' | 'find' | 'text' | 'emitted'>

const { adjustItemKey } = vi.hoisted(() => ({ adjustItemKey: vi.fn() }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { adjustItemKey },
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
const textInput = defineComponent({
  props: { modelValue: String, id: String },
  emits: ['update:modelValue'],
  template:
    '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const textArea = defineComponent({
  props: { modelValue: String, id: String },
  emits: ['update:modelValue'],
  template:
    '<textarea :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const select = defineComponent({
  props: { modelValue: String },
  emits: ['update:modelValue'],
  template: '<select :value="modelValue"><slot /></select>',
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
  Input: textInput,
  Textarea: textArea,
  Select: select,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
}

const item = {
  questionId: 'q1',
  questionVersion: 1,
  position: 10,
  type: 'MULTIPLE_CHOICE' as const,
  marker: 'NEW' as const,
  summary: 'Ibu kota Indonesia',
  points: 5,
}

const open = () =>
  mount(AdjustKeyDialog, {
    props: { open: true, packageId: 'p1', item },
    global: { stubs },
  })

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

describe('AdjustKeyDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses to save without a reason', () => {
    const wrapper = open()

    expect(
      buttonByText(wrapper, 'Simpan Ralat')!.attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('marks the question as a bonus for everyone', async () => {
    adjustItemKey.mockResolvedValue({
      success: true,
      data: { rescoredSessions: 3 },
    })
    const wrapper = open()
    await wrapper.find('textarea').setValue('Kunci soal keliru')

    await buttonByText(wrapper, 'Simpan Ralat')!.trigger('click')
    await flushPromises()

    expect(adjustItemKey).toHaveBeenCalledWith('p1', 'q1', {
      resolution: 'BONUS_ALL',
      overrideContent: undefined,
      reason: 'Kunci soal keliru',
    })
    expect(wrapper.emitted('adjusted')?.[0]).toEqual([3])
    wrapper.unmount()
  })

  it('builds a boolean override for a true/false item', async () => {
    adjustItemKey.mockResolvedValue({
      success: true,
      data: { rescoredSessions: 1 },
    })
    const wrapper = mount(AdjustKeyDialog, {
      props: {
        open: true,
        packageId: 'p1',
        item: { ...item, type: 'TRUE_FALSE' },
      },
      global: { stubs },
    })
    await wrapper.findAll('textarea')[0].setValue('Kunci benar salah keliru')

    await buttonByText(wrapper, 'Simpan Ralat')!.trigger('click')
    await flushPromises()

    expect(adjustItemKey).toHaveBeenCalledWith('p1', 'q1', {
      resolution: 'BONUS_ALL',
      overrideContent: undefined,
      reason: 'Kunci benar salah keliru',
    })
    wrapper.unmount()
  })

  it('shows the server refusal and stays open', async () => {
    adjustItemKey.mockResolvedValue({
      success: false,
      error: 'Soal tidak ada di paket ini',
    })
    const wrapper = open()
    await wrapper.find('textarea').setValue('Ralat kunci nomor 10')

    await buttonByText(wrapper, 'Simpan Ralat')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Soal tidak ada di paket ini')
    expect(wrapper.emitted('adjusted')).toBeUndefined()
    wrapper.unmount()
  })
})
