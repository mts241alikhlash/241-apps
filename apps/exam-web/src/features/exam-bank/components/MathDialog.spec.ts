// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import MathDialog from './MathDialog.vue'
import MathPreview from './MathPreview.vue'

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const field = defineComponent({
  props: { label: String, for: String, floating: Boolean },
  template: '<div><label :for="$props.for">{{ label }}</label><slot /></div>',
})
const button = defineComponent({
  props: { disabled: Boolean },
  template: '<button :disabled="disabled"><slot /></button>',
})
const stubs = {
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  FloatingLabelField: field,
  Button: button,
}

function mountDialog(initial = '') {
  return mount(MathDialog, {
    props: { open: true, initial, editing: false },
    global: { stubs },
  })
}

describe('MathPreview', () => {
  it('renders the formula as KaTeX, and nothing for an empty one', () => {
    expect(
      mount(MathPreview, { props: { latex: '\\frac{1}{2}' } })
        .find('.katex')
        .exists(),
    ).toBe(true)
    expect(
      mount(MathPreview, { props: { latex: '  ' } })
        .find('.katex')
        .exists(),
    ).toBe(false)
  })
})

describe('MathDialog', () => {
  it('previews what is typed and hands the formula over on insert', async () => {
    const wrapper = mountDialog()
    expect(
      wrapper.get('button:last-child').attributes('disabled'),
    ).toBeDefined()

    await wrapper.get('textarea').setValue('\\frac{1}{2}')

    expect(wrapper.find('.katex').exists()).toBe(true)
    await wrapper.get('button:last-child').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([['\\frac{1}{2}']])
  })

  it('starts from the formula being edited', () => {
    const wrapper = mountDialog('x^2')

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'x^2',
    )
  })
})
