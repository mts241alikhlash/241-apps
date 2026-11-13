// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'
import RosterPrintAllView from './RosterPrintAllView.vue'

const { loadEvents, loadRooms, loadRoster, loadLetterhead } = vi.hoisted(
  () => ({
    loadEvents: vi.fn(),
    loadRooms: vi.fn(),
    loadRoster: vi.fn(),
    loadLetterhead: vi.fn(),
  }),
)

vi.mock('../../exam-event/services/examEventService', () => ({
  examEventService: { loadEvents, loadRooms },
}))
vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadRoster, loadLetterhead },
}))
vi.mock('../components/RosterSheet.vue', () => ({
  default: defineComponent({
    props: { rows: Array, roomLabel: String },
    template: '<div data-test="sheet">{{ roomLabel }}</div>',
  }),
}))

const passthrough = defineComponent({ template: '<div><slot /></div>' })
const stubs = {
  Card: passthrough,
  CardHeader: passthrough,
  CardTitle: passthrough,
  CardContent: passthrough,
  FloatingLabelField: passthrough,
  Select: passthrough,
  SelectContent: passthrough,
  SelectItem: passthrough,
  SelectTrigger: passthrough,
  SelectValue: passthrough,
}

const room = (id: string) => ({
  id,
  code: id.toUpperCase(),
  name: `Ruang ${id}`,
})
const roster = { data: [{ studentId: 's1' }], total: 1 }

async function mountView() {
  const wrapper = mount(RosterPrintAllView, {
    props: { kind: 'cards' },
    global: { stubs },
  })
  await flushPromises()
  return wrapper
}

describe('RosterPrintAllView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadEvents.mockResolvedValue({
      success: true,
      data: [{ id: 'e1', name: 'UAS', status: 'ACTIVE' }],
    })
    loadRooms.mockResolvedValue({
      success: true,
      data: [room('r1'), room('r2')],
    })
    loadLetterhead.mockResolvedValue(null)
  })

  it('skips a room the user is not on duty in and prints the rest', async () => {
    loadRoster
      .mockResolvedValueOnce(roster)
      .mockRejectedValueOnce(
        new ServiceRequestError(403, { message: 'Bukan pengawas' }),
      )

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-test="sheet"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('1 ruangan dilewati')
    wrapper.unmount()
  })

  it('reports any other failure with a retry instead of dropping the room', async () => {
    loadRoster
      .mockResolvedValueOnce(roster)
      .mockRejectedValueOnce(new ServiceRequestError(500, { message: 'down' }))

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-test="sheet"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Dokumen tidak dapat dimuat')
    expect(wrapper.text()).toContain('Coba lagi')
    expect(wrapper.text()).not.toContain('ruangan dilewati')
    wrapper.unmount()
  })
})
