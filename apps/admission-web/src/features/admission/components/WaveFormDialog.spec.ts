// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WaveFormDialog from './WaveFormDialog.vue'

const passthrough = { template: '<div><slot /></div>' }
function mountWave(startDate = '2026-10-20', endDate = '2026-10-10') {
  return mount(WaveFormDialog, {
    props: {
      open: true,
      isSaving: false,
      academicYears: [],
      wave: {
        filledCount: 0,
        id: 'wave-1',
        name: 'Gelombang 1',
        code: 'G1',
        academicYear: { id: 'year-1', name: '2026/2027' },
        academicYearId: 'year-1',
        description: null,
        lastRegistrationSeq: 0,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        startDate,
        endDate,
        quota: 100,
        registrationFee: 250000,
        isActive: true,
      },
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
      },
    },
  })
}

describe('wave form control semantics', () => {
  it('connects quota and fee labels to actual numeric inputs', () => {
    const wrapper = mountWave()
    const inputs = wrapper.findAll('input[inputmode="numeric"]')
    expect(inputs).toHaveLength(2)
    for (const input of inputs) {
      expect(input.attributes('id')).toBeTruthy()
      expect(
        wrapper.find(`label[for="${input.attributes('id')}"]`).exists(),
      ).toBe(true)
      expect(input.attributes('aria-describedby')).toBeTruthy()
    }
    wrapper.unmount()
  })

  it.each([
    [
      '2026-10-20',
      '2026-10-10',
      'Tanggal selesai harus setelah tanggal mulai.',
    ],
    ['2026-10-20', '', 'Tanggal selesai wajib diisi'],
  ])(
    'shows date range validation on the visible range control (%s, %s)',
    async (start, end, message) => {
      const wrapper = mountWave(start, end)
      await flushPromises()
      await wrapper.get('form').trigger('submit')
      await vi.waitFor(() => {
        const label = wrapper
          .findAll('label')
          .find((item) => item.text() === message)
        expect(label).toBeDefined()
        const trigger = wrapper.get('button[aria-label="Rentang Tanggal"]')
        expect(trigger.element.tagName).toBe('BUTTON')
        expect(trigger.attributes('aria-invalid')).toBe('true')
        const messageId = trigger
          .attributes('aria-describedby')!
          .split(' ')
          .at(-1)
        expect(wrapper.get(`[id="${messageId}"]`).text()).toBe(message)
      })
      expect(wrapper.emitted('save')).toBeUndefined()
      wrapper.unmount()
    },
  )
})
