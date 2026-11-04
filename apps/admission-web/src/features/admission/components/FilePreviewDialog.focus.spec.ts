// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import FilePreviewDialog from './FilePreviewDialog.vue'

vi.mock('../api/admissionApi', () => ({
  admissionApi: {
    getFile: vi.fn().mockResolvedValue({ data: new Blob(['x']) }),
  },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const sheet = {
  id: 'f3',
  originalName: 'data.xlsx',
  mimeType: 'application/vnd.ms-excel',
}

const Host = defineComponent({
  setup() {
    const open = ref(false)
    return () => [
      h(
        'button',
        { id: 'trigger', onClick: () => (open.value = true) },
        'Buka',
      ),
      h(FilePreviewDialog, {
        open: open.value,
        file: sheet,
        'onUpdate:open': (value: boolean) => (open.value = value),
      }),
    ]
  },
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FilePreviewDialog focus', () => {
  it('returns focus to the button that opened it', async () => {
    const wrapper = mount(Host, { attachTo: document.body })
    const trigger = wrapper.get('#trigger').element as HTMLButtonElement
    trigger.focus()
    await wrapper.get('#trigger').trigger('click')
    await flushPromises()

    const close = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Tutup'),
    )!
    close.click()
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
  })
})
