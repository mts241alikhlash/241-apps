// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import WeeklyHolidaysSection from './WeeklyHolidaysSection.vue'

const passthrough = { template: '<div><slot /></div>' }

it('checks saved holidays and toggles the clicked day', async () => {
  const wrapper = mount(WeeklyHolidaysSection, {
    props: { draft: [0], isSaving: false, canEdit: true },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogFooter: passthrough,
      },
    },
  })

  expect(wrapper.get('#holiday-0').attributes('data-state')).toBe('checked')
  expect(wrapper.get('#holiday-1').attributes('data-state')).toBe('unchecked')

  await wrapper.get('#holiday-1').trigger('click')

  expect(wrapper.emitted('toggle')).toEqual([[1]])
})
