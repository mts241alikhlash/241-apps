// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import SessionTimelineDialog from './SessionTimelineDialog.vue'
import type { SessionTimelineEntry } from '../types'

const { loadTimeline } = vi.hoisted(() => ({ loadTimeline: vi.fn() }))
vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadTimeline },
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const dialog = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})
const button = defineComponent({
  props: { variant: String, disabled: Boolean },
  emits: ['click'],
  template:
    '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
const badge = defineComponent({
  props: { variant: String },
  template: '<span><slot /></span>',
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
  Badge: badge,
}

const entry = (
  id: string,
  isViolation: boolean,
  detail: string,
): SessionTimelineEntry => ({
  id,
  kind: 'EVENT',
  occurredAt: '2026-11-07T06:31:19.000Z',
  type: isViolation ? 'LEFT_APP' : 'FOCUS_LOST_BRIEF',
  action: null,
  isViolation,
  detail,
  actorId: null,
  reason: null,
  metadata: {},
})

const open = () =>
  mount(SessionTimelineDialog, {
    props: { open: true, sessionId: 's1', studentName: 'Rapa Azilam' },
    global: { stubs },
  })

describe('SessionTimelineDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadTimeline.mockResolvedValue({
      success: true,
      data: [
        entry('e1', false, 'Fokus jendela hilang sebentar'),
        entry('e2', true, 'Siswa keluar dari aplikasi ujian'),
      ],
    })
  })

  it('shows only counted violations first and states how many are hidden', async () => {
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain('Siswa keluar dari aplikasi ujian')
    expect(wrapper.text()).not.toContain('Fokus jendela hilang sebentar')
    expect(wrapper.text()).toContain('1 kejadian lain disembunyikan')
    wrapper.unmount()
  })

  it('reveals the remaining entries through the toggle', async () => {
    const wrapper = open()
    await flushPromises()

    const toggle = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Tampilkan semua')
    await toggle!.trigger('click')

    expect(wrapper.text()).toContain('Fokus jendela hilang sebentar')
    expect(wrapper.text()).not.toContain('kejadian lain disembunyikan')
    wrapper.unmount()
  })

  it('says so when every entry was informational', async () => {
    loadTimeline.mockResolvedValue({
      success: true,
      data: [entry('e1', false, 'Fokus jendela hilang sebentar')],
    })
    const wrapper = open()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Tidak ada pelanggaran yang dihitung pada sesi ini.',
    )
    wrapper.unmount()
  })
})
