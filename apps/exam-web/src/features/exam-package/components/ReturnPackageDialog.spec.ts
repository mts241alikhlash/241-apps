// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import ReturnPackageDialog from './ReturnPackageDialog.vue'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

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
const textarea = defineComponent({
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
  Button: button,
  FloatingLabelField: field,
  Textarea: textarea,
}

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

const open = (props: Record<string, unknown> = {}) =>
  mount(ReturnPackageDialog, {
    props: { open: true, noteCount: 0, busy: false, error: null, ...props },
    global: { stubs },
  })

describe('ReturnPackageDialog', () => {
  it('keeps Kembalikan disabled until a general note is typed', async () => {
    const wrapper = open()
    expect(
      buttonByText(wrapper, 'Kembalikan')!.attributes('disabled'),
    ).toBeDefined()

    await wrapper.find('textarea').setValue('Perbaiki')

    expect(
      buttonByText(wrapper, 'Kembalikan')!.attributes('disabled'),
    ).toBeUndefined()
    wrapper.unmount()
  })

  it('sends the note it was given', async () => {
    const wrapper = open()
    await wrapper.find('textarea').setValue('Perbaiki soal pertama')

    await buttonByText(wrapper, 'Kembalikan')!.trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([['Perbaiki soal pertama']])
    wrapper.unmount()
  })

  it('says how many questions already carry a note', () => {
    expect(open({ noteCount: 2 }).text()).toContain(
      '2 soal sudah diberi catatan',
    )
    expect(open({ noteCount: 0 }).text()).toContain(
      'Belum ada catatan pada soal',
    )
  })

  it('shows the server message', () => {
    expect(open({ error: 'Catatan wajib diisi' }).text()).toContain(
      'Catatan wajib diisi',
    )
  })

  it('closes with Batal', async () => {
    const wrapper = open()

    await buttonByText(wrapper, 'Batal')!.trigger('click')

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })
})
