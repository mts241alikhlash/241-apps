import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { kioskService } from '../services/kioskService'
import KioskView from './KioskView.vue'

const queue = {
  pendingCount: { value: 0 },
  all: vi.fn().mockResolvedValue([]),
  enqueue: vi.fn().mockResolvedValue(undefined),
  acknowledge: vi.fn().mockResolvedValue(undefined),
  refreshCount: vi.fn().mockResolvedValue(undefined),
}

vi.mock('../composables/useScanQueue', () => ({ useScanQueue: () => queue }))
vi.mock('../composables/useServerClock', () => ({
  useServerClock: () => ({
    anchorId: { value: null },
    setAnchor: vi.fn(),
    deriveOccurredAt: vi.fn(() => null),
    isAnchorStale: vi.fn(() => true),
  }),
}))
vi.mock('../services/kioskService', () => ({
  kioskService: {
    isPaired: vi.fn(() => true),
    migrateLegacyToken: vi.fn().mockResolvedValue(undefined),
    syncClock: vi.fn().mockResolvedValue(false),
    flush: vi.fn().mockResolvedValue({ sent: 0, cleared: 0 }),
    submit: vi.fn(),
  },
}))

describe('KioskView scan feedback', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('shows rejection after Enter without marking an unqueued scan as saved', async () => {
    vi.mocked(kioskService.submit).mockResolvedValue({
      result: {
        outcome: 'REJECTED_OFFLINE',
        direction: 'NONE',
        dayStatus: 'PRESENT',
        lateMinutes: 0,
        recordedAt: '',
        rejectionReason:
          'Jam perangkat perlu disinkronkan sebelum scan offline.',
      },
      queued: false,
    })
    const wrapper = mount(KioskView, {
      global: { stubs: { KioskPairingView: true } },
    })
    try {
      const input = wrapper.find('input')
      await input.setValue('kartu-1')
      await input.trigger('keyup.enter')
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('Jam perangkat perlu disinkronkan')
      })

      expect(kioskService.submit).toHaveBeenCalledWith(
        'kartu-1',
        expect.any(Object),
        queue,
      )
      expect(wrapper.text()).not.toContain('Tersimpan – menunggu koneksi')
      expect(wrapper.text()).not.toContain('Masuk')
    } finally {
      wrapper.unmount()
    }
  })
})
