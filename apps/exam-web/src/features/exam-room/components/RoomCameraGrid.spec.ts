// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RoomCameraGrid from './RoomCameraGrid.vue'
import type { RoomCameraSeat } from '../types'

const { loadSnapshot } = vi.hoisted(() => ({ loadSnapshot: vi.fn() }))

vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadSnapshot },
}))

const createObjectURL = vi.fn(
  (_blob: Blob) => `blob:seat-${createObjectURL.mock.calls.length}`,
)
const revokeObjectURL = vi.fn()

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const seat = (overrides: Partial<RoomCameraSeat> = {}): RoomCameraSeat => ({
  sessionId: 's1',
  studentName: 'Ahmad Fauzi',
  nis: '2024001',
  lastSnapshotAt: ago(5_000),
  cameraBlocked: null,
  latestSnapshotUrl: '/exam-sessions/s1/snapshots/latest',
  ...overrides,
})

function mountGrid(seats: RoomCameraSeat[], serverTime: string | null = null) {
  return mount(RoomCameraGrid, {
    props: { seats, serverTime },
    global: {
      stubs: { SessionSnapshotGalleryDialog: true },
    },
  })
}

function deferred() {
  let settle: ((value: Blob | null) => void) | null = null
  const promise = new Promise<Blob | null>((resolve) => {
    settle = resolve
  })
  return { promise, resolve: (value: Blob | null) => settle?.(value) }
}

function jpeg() {
  return new Blob(['jpeg'], { type: 'image/jpeg' })
}

beforeEach(() => {
  loadSnapshot.mockReset()
  loadSnapshot.mockResolvedValue(jpeg())
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  vi.stubGlobal('URL', {
    ...globalThis.URL,
    createObjectURL,
    revokeObjectURL,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RoomCameraGrid', () => {
  it('fetches the snapshot once per seat on mount', async () => {
    const wrapper = mountGrid([seat()])
    await flushPromises()

    expect(loadSnapshot).toHaveBeenCalledTimes(1)
    expect(loadSnapshot).toHaveBeenCalledWith(
      '/exam-sessions/s1/snapshots/latest',
    )
    expect(wrapper.find('[data-testid="seat-image"]').attributes('src')).toBe(
      'blob:seat-1',
    )
  })

  it('builds the path itself when the payload carries none', async () => {
    const wrapper = mountGrid([seat({ latestSnapshotUrl: null })])
    await flushPromises()

    expect(loadSnapshot).toHaveBeenCalledWith(
      '/exam-sessions/s1/snapshots/latest',
    )
    expect(wrapper.find('[data-testid="seat-image"]').exists()).toBe(true)
  })

  it('refreshes the image only when lastSnapshotAt changes', async () => {
    const initial = seat()
    const wrapper = mountGrid([initial])
    await flushPromises()

    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()
    expect(loadSnapshot).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ seats: [seat({ lastSnapshotAt: ago(1_000) })] })
    await flushPromises()
    expect(loadSnapshot).toHaveBeenCalledTimes(2)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:seat-1')
  })

  it('classifies each seat and marks it on the card', async () => {
    const wrapper = mountGrid([
      seat({ sessionId: 'live' }),
      seat({ sessionId: 'stale', lastSnapshotAt: ago(60_000) }),
      seat({ sessionId: 'offline', lastSnapshotAt: ago(120_000) }),
      seat({ sessionId: 'blocked', cameraBlocked: 'permission' }),
    ])
    await flushPromises()

    const status = wrapper
      .findAll('[data-testid="seat-card"]')
      .map((card) => card.attributes('data-status'))

    expect(status).toEqual(['live', 'stale', 'offline', 'blocked'])
  })

  it('classifies against the server clock, not the device clock', async () => {
    const wrapper = mountGrid(
      [seat({ lastSnapshotAt: '2026-11-02T01:09:55.000Z' })],
      '2026-11-02T01:10:00.000Z',
    )
    await flushPromises()

    expect(
      wrapper.find('[data-testid="seat-card"]').attributes('data-status'),
    ).toBe('live')
  })

  it('does not request a snapshot for a seat without one', async () => {
    const wrapper = mountGrid([seat({ lastSnapshotAt: null })])
    await flushPromises()

    expect(loadSnapshot).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="seat-image"]').exists()).toBe(false)
  })

  it('degrades a rejected fetch to the placeholder and keeps its siblings', async () => {
    loadSnapshot.mockResolvedValueOnce(null).mockResolvedValueOnce(jpeg())
    const wrapper = mountGrid([
      seat({ sessionId: 'denied' }),
      seat({ sessionId: 'ok', latestSnapshotUrl: '/ok' }),
    ])
    await flushPromises()

    const cards = wrapper.findAll('[data-testid="seat-card"]')
    expect(cards[0].find('[data-testid="seat-no-image"]').exists()).toBe(true)
    expect(cards[1].find('[data-testid="seat-image"]').exists()).toBe(true)
  })

  it('retries a seat whose fetch failed without waiting for a new stamp', async () => {
    loadSnapshot.mockResolvedValueOnce(null).mockResolvedValueOnce(jpeg())
    const initial = seat()
    const wrapper = mountGrid([initial])
    await flushPromises()

    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()

    expect(loadSnapshot).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="seat-image"]').exists()).toBe(true)
  })

  it('stops refetching after three consecutive failures until the stamp changes', async () => {
    loadSnapshot.mockResolvedValue(null)
    const initial = seat()
    const wrapper = mountGrid([initial])
    await flushPromises()

    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()
    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()
    expect(loadSnapshot).toHaveBeenCalledTimes(3)

    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()
    await wrapper.setProps({ seats: [{ ...initial }] })
    await flushPromises()
    expect(loadSnapshot).toHaveBeenCalledTimes(3)

    loadSnapshot.mockResolvedValue(jpeg())
    await wrapper.setProps({ seats: [seat({ lastSnapshotAt: ago(1_000) })] })
    await flushPromises()

    expect(loadSnapshot).toHaveBeenCalledTimes(4)
    expect(wrapper.find('[data-testid="seat-image"]').exists()).toBe(true)
  })

  it('drops a resolution that lost the race for the same seat', async () => {
    const first = deferred()
    loadSnapshot
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(jpeg())
    const wrapper = mountGrid([seat()])
    await flushPromises()

    await wrapper.setProps({ seats: [seat({ lastSnapshotAt: ago(1_000) })] })
    await flushPromises()
    first.resolve(jpeg())
    await flushPromises()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="seat-image"]').attributes('src')).toBe(
      'blob:seat-1',
    )
  })

  it('opens the evidence gallery for the clicked seat', async () => {
    const wrapper = mountGrid([seat()])
    await flushPromises()

    await wrapper.find('[data-testid="seat-card"]').trigger('click')
    await nextTick()

    const gallery = wrapper.findComponent({
      name: 'SessionSnapshotGalleryDialog',
    })
    expect(gallery.exists()).toBe(true)
    expect(gallery.props('open')).toBe(true)
    expect(gallery.props('sessionId')).toBe('s1')
  })

  it('opens the gallery from the keyboard and names the card', async () => {
    const wrapper = mountGrid([seat()])
    await flushPromises()

    const card = wrapper.find('[data-testid="seat-card"]')
    expect(card.attributes('role')).toBe('button')
    expect(card.attributes('tabindex')).toBe('0')
    expect(card.attributes('aria-label')).toBe('Galeri bukti Ahmad Fauzi')

    await card.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(
      wrapper
        .findComponent({ name: 'SessionSnapshotGalleryDialog' })
        .props('open'),
    ).toBe(true)
  })

  it('revokes every object URL on unmount', async () => {
    const wrapper = mountGrid([seat()])
    await flushPromises()

    wrapper.unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:seat-1')
  })

  it('revokes a fetch that lands after unmount', async () => {
    const late = deferred()
    loadSnapshot.mockImplementationOnce(() => late.promise)
    const wrapper = mountGrid([seat()])
    await flushPromises()

    wrapper.unmount()
    late.resolve(jpeg())
    await flushPromises()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:seat-1')
  })

  it('discards a fetch that lands after the seat lost its snapshot', async () => {
    const early = deferred()
    loadSnapshot.mockImplementationOnce(() => early.promise)
    const wrapper = mountGrid([seat()])
    await flushPromises()

    await wrapper.setProps({ seats: [seat({ lastSnapshotAt: null })] })
    await flushPromises()
    early.resolve(jpeg())
    await flushPromises()

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="seat-image"]').exists()).toBe(false)
  })
})
