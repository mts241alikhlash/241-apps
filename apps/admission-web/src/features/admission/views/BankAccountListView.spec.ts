// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BankAccountListView from './BankAccountListView.vue'

const service = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../services/bankAccountService', () => ({
  bankAccountService: service,
}))

const passthrough = { template: '<div><slot /></div>' }

function mountView() {
  return mount(BankAccountListView, {
    global: {
      stubs: {
        Tooltip: passthrough,
        TooltipTrigger: passthrough,
        TooltipContent: passthrough,
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        AlertDialog: passthrough,
        AlertDialogContent: passthrough,
        AlertDialogHeader: passthrough,
        AlertDialogTitle: passthrough,
        AlertDialogDescription: passthrough,
        AlertDialogFooter: passthrough,
        AlertDialogCancel: { template: '<button><slot /></button>' },
        AlertDialogAction: { template: '<button><slot /></button>' },
      },
    },
  })
}

it('adds an account with the digits of its number and reloads the list', async () => {
  service.fetchAll.mockResolvedValue({ accounts: [] })
  service.save.mockResolvedValue({ success: true })
  const wrapper = mountView()
  await flushPromises()
  expect(service.fetchAll).toHaveBeenCalledTimes(1)

  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Tambah')!
    .trigger('click')
  await wrapper.get('input[name="bankName"]').setValue('BSI')
  await wrapper.get('input[name="accountNumber"]').setValue('7123-456 789')
  await wrapper.get('input[name="accountHolder"]').setValue('MTs Al-Ikhlash')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await vi.waitFor(() => expect(service.save).toHaveBeenCalled())

  expect(service.save).toHaveBeenCalledWith(null, {
    bankName: 'BSI',
    accountNumber: '7123456789',
    accountHolder: 'MTs Al-Ikhlash',
    isActive: true,
  })
  expect(service.fetchAll).toHaveBeenCalledTimes(2)
})

it('refuses an account number that is too short', async () => {
  service.fetchAll.mockResolvedValue({ accounts: [] })
  service.save.mockClear()
  const wrapper = mountView()
  await flushPromises()
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Tambah')!
    .trigger('click')
  await wrapper.get('input[name="bankName"]').setValue('BSI')
  await wrapper.get('input[name="accountNumber"]').setValue('12')
  await wrapper.get('input[name="accountHolder"]').setValue('MTs')
  await wrapper.get('form').trigger('submit')
  await flushPromises()

  await vi.waitFor(() =>
    expect(wrapper.text()).toContain('Nomor rekening 5–30 digit angka'),
  )
  expect(service.save).not.toHaveBeenCalled()
})
