// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import RenamePackageDialog from './RenamePackageDialog.vue'

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const { rename } = vi.hoisted(() => ({ rename: vi.fn() }))
vi.mock('../services/examPackageService', () => ({
  examPackageService: { rename },
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
}

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

const open = () =>
  mount(RenamePackageDialog, {
    props: { open: true, packageId: 'p1', title: 'UAS' },
    global: { stubs },
  })

describe('RenamePackageDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts from the current title', () => {
    const wrapper = open()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe(
      'UAS',
    )
    wrapper.unmount()
  })

  it('renames and closes', async () => {
    rename.mockResolvedValue({ success: true, data: { id: 'p1' } })
    const wrapper = open()
    await wrapper.find('input').setValue('  UAS Genap  ')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(rename).toHaveBeenCalledWith('p1', 'UAS Genap')
    expect(wrapper.emitted('renamed')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })

  it('refuses a blank title without calling the server', async () => {
    const wrapper = open()
    await wrapper.find('input').setValue('   ')

    expect(
      buttonByText(wrapper, 'Simpan')!.attributes('disabled'),
    ).toBeDefined()
    wrapper.unmount()
  })

  it('shows the server message and stays open when refused', async () => {
    rename.mockResolvedValue({
      success: false,
      error: 'Paket berstatus LOCKED dan tidak bisa diubah',
    })
    const wrapper = open()
    await wrapper.find('input').setValue('Baru')

    await buttonByText(wrapper, 'Simpan')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Paket berstatus LOCKED')
    expect(wrapper.emitted('renamed')).toBeUndefined()
    wrapper.unmount()
  })
})
