// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import EventFormDialog from './EventFormDialog.vue'

vi.mock('../services/examEventService', () => ({
  examEventService: { saveEvent: vi.fn() },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const item = defineComponent({
  props: { value: String },
  template: '<option :value="value"><slot /></option>',
})

const stubs = {
  Dialog: dialog,
  DialogContent: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
  DialogDescription: passthrough,
  DialogBody: passthrough,
  DialogFooter: passthrough,
  Button: passthrough,
  Checkbox: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: item,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
  DatePicker: passthrough,
  Input: passthrough,
  FormattedNumberInput: passthrough,
}

describe('EventFormDialog', () => {
  it('only offers MIDTERM (UTS) and FINAL (UAS) types', () => {
    const wrapper = mount(EventFormDialog, {
      props: { open: true, semesterId: 'sem-1' },
      global: { stubs },
    })

    const options = wrapper.findAll('option').map((opt) => ({
      value: (opt.element as HTMLOptionElement).value,
      text: opt.text(),
    }))
    expect(options).toEqual([
      { value: 'MIDTERM', text: 'UTS' },
      { value: 'FINAL', text: 'UAS' },
    ])
  })
})
