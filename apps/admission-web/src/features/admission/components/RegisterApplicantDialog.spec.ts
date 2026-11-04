// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import RegisterApplicantDialog from './RegisterApplicantDialog.vue'

const passthrough = { template: '<div><slot /></div>' }

it('marks full waves and does not let them be chosen', () => {
  const wrapper = mount(RegisterApplicantDialog, {
    props: {
      open: true,
      waves: [
        { id: 'w1', name: 'G1', remainingQuota: 0 },
        { id: 'w2', name: 'G2', remainingQuota: 5 },
      ] as never,
      grades: [],
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
        Select: passthrough,
        SelectTrigger: passthrough,
        SelectValue: passthrough,
        SelectContent: passthrough,
        SelectItem: {
          props: ['value', 'disabled'],
          template:
            '<div data-test="wave-option" :data-disabled="String(!!disabled)"><slot /></div>',
        },
      },
    },
  })
  const options = wrapper.findAll('[data-test="wave-option"]')
  expect(options[0].text()).toContain('G1 (penuh)')
  expect(options[0].attributes('data-disabled')).toBe('true')
  expect(options[1].attributes('data-disabled')).toBe('false')
})
