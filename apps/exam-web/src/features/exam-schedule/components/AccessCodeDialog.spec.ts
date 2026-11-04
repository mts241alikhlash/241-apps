// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import AccessCodeDialog from './AccessCodeDialog.vue'

const {
  loadAccessCode,
  rotateAccessCode,
  toastSuccess,
  toastError,
  writeText,
} = vi.hoisted(() => ({
  loadAccessCode: vi.fn(),
  rotateAccessCode: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  writeText: vi.fn(),
}))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { loadAccessCode, rotateAccessCode },
}))
vi.mock('vue-sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean, type: String },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
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
  AlertDialog: dialog,
  AlertDialogContent: passthrough,
  AlertDialogHeader: passthrough,
  AlertDialogFooter: passthrough,
  AlertDialogTitle: passthrough,
  AlertDialogDescription: passthrough,
  AlertDialogCancel: button,
  AlertDialogAction: button,
}

const buttonByText = (host: unknown, text: string) =>
  (host as VueWrapper)
    .findAll('button')
    .find(
      (candidateButton) =>
        candidateButton.text() === text ||
        candidateButton.attributes('aria-label') === text,
    )

function mountDialog(open: boolean) {
  return mount(AccessCodeDialog, {
    props: { open, scheduleId: 's1', title: 'UTS Matematika · VII A' },
    global: { stubs },
  })
}

describe('AccessCodeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadAccessCode.mockResolvedValue({
      success: true,
      data: { accessCode: 'K7M2QX', rotation: 0 },
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    writeText.mockResolvedValue(undefined)
  })

  it('asks for the code only when it is opened', async () => {
    const wrapper = mountDialog(false)
    await flushPromises()
    expect(loadAccessCode).not.toHaveBeenCalled()

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(loadAccessCode).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('K7M2QX')
    expect(wrapper.text()).toContain('UTS Matematika · VII A')
    wrapper.unmount()
  })

  it('copies the code', async () => {
    const wrapper = mountDialog(true)
    await flushPromises()

    await buttonByText(wrapper, 'Salin')!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('K7M2QX')
    expect(toastSuccess).toHaveBeenCalledWith('Token disalin.')
    wrapper.unmount()
  })

  it('asks for confirmation before it rotates and then shows the new code', async () => {
    rotateAccessCode.mockResolvedValue({
      success: true,
      data: { accessCode: 'P4N8TZ', rotation: 1 },
    })
    const wrapper = mountDialog(true)
    await flushPromises()

    await buttonByText(wrapper, 'Ganti Token')!.trigger('click')
    expect(rotateAccessCode).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Token lama berhenti berlaku')

    await buttonByText(wrapper, 'Ya, ganti')!.trigger('click')
    await flushPromises()

    expect(rotateAccessCode).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('P4N8TZ')
    expect(wrapper.text()).not.toContain('K7M2QX')
    wrapper.unmount()
  })

  it('forgets the code when it is closed', async () => {
    const wrapper = mountDialog(true)
    await flushPromises()
    expect(wrapper.text()).toContain('K7M2QX')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(wrapper.text()).not.toContain('K7M2QX')
    await flushPromises()
    wrapper.unmount()
  })

  it('shows the server message when the schedule was cancelled', async () => {
    loadAccessCode.mockResolvedValue({
      success: false,
      error: 'Jadwal sudah dibatalkan',
    })
    const wrapper = mountDialog(true)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Jadwal sudah dibatalkan',
    )
    expect(wrapper.text()).not.toContain('K7M2QX')
    wrapper.unmount()
  })

  it('tells the user to copy by hand when the browser refuses to copy', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const wrapper = mountDialog(true)
    await flushPromises()

    await buttonByText(wrapper, 'Salin')!.trigger('click')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith(
      'Tidak dapat menyalin. Salin token secara manual.',
    )
    expect(toastSuccess).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('lets the user try again after the code could not be loaded', async () => {
    loadAccessCode.mockResolvedValueOnce({
      success: false,
      error: 'Layanan tidak dapat dihubungi.',
    })
    const wrapper = mountDialog(true)
    await flushPromises()
    expect(wrapper.text()).not.toContain('K7M2QX')

    await buttonByText(wrapper, 'Coba lagi')!.trigger('click')
    await flushPromises()

    expect(loadAccessCode).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('K7M2QX')
    wrapper.unmount()
  })

  it('names the code in text a screen reader reads together with it', async () => {
    const wrapper = mountDialog(true)
    await flushPromises()

    expect(wrapper.find('[aria-label="Token ujian"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="code"]').text()).toContain('Token ujian:')
    expect(wrapper.get('[data-test="code"]').text()).toContain('K7M2QX')
    wrapper.unmount()
  })
})
