// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import MakeupParticipantsDialog from './MakeupParticipantsDialog.vue'

const { loadParticipants, removeParticipant, permissions } = vi.hoisted(() => ({
  loadParticipants: vi.fn(),
  removeParticipant: vi.fn(),
  permissions: new Set<string>(),
}))
vi.mock('../services/examScheduleService', () => ({
  examScheduleService: { loadParticipants, removeParticipant },
}))
vi.mock('@/features/platform/auth', () => ({
  useAuthSession: () => ({
    hasPermission: (code: string) => permissions.has(code),
  }),
}))

type Wrapper = Pick<VueWrapper, 'findAll' | 'get'>

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, size: String, disabled: Boolean },
  template: '<button :disabled="disabled" type="button"><slot /></button>',
})
const dataTable = defineComponent({
  name: 'DataTable',
  props: { data: Array, columns: Array },
  template:
    '<div><div v-for="(row, index) in data" :key="index" data-test="row">{{ row.name }} · {{ row.status }}</div><slot name="empty" v-if="!data.length" /></div>',
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
  DataTable: dataTable,
}

const rows = [
  {
    studentId: 'a',
    name: 'Ani',
    nis: '1',
    reason: 'SICK',
    note: null,
    status: 'WAITING',
  },
  {
    studentId: 'b',
    name: 'Budi',
    nis: '2',
    reason: 'SICK',
    note: null,
    status: 'DONE',
  },
]

const buttonByText = (host: Wrapper, text: string) =>
  host.findAll('button').find((candidate) => candidate.text() === text)

async function open() {
  const wrapper = mount(MakeupParticipantsDialog, {
    props: { open: true, scheduleId: 'm1', title: 'UTS (Susulan)' },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

describe('MakeupParticipantsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.clear()
    permissions.add('exam-grading.grade')
    loadParticipants.mockResolvedValue({ success: true, data: rows })
  })

  it('lists the students of the makeup with their status', async () => {
    const wrapper = await open()

    expect(loadParticipants).toHaveBeenCalledWith('m1')
    expect(
      wrapper.findAll('[data-test="row"]').map((row) => row.text()),
    ).toEqual(['Ani · WAITING', 'Budi · DONE'])
    wrapper.unmount()
  })

  it('shows the server message with a retry when the list cannot load', async () => {
    loadParticipants.mockResolvedValueOnce({
      success: false,
      error: 'Gagal memuat peserta susulan.',
    })
    const wrapper = await open()
    expect(wrapper.text()).toContain('Gagal memuat peserta susulan.')

    loadParticipants.mockResolvedValue({ success: true, data: rows })
    await buttonByText(wrapper, 'Coba lagi')!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-test="row"]')).toHaveLength(2)
    wrapper.unmount()
  })

  it('closes with Tutup', async () => {
    const wrapper = await open()

    await buttonByText(wrapper, 'Tutup')!.trigger('click')

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })
})
