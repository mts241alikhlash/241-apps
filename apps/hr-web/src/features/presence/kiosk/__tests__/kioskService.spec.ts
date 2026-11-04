import { beforeEach, describe, expect, it, vi } from 'vitest'
import { kioskApi } from '../api/kioskApi'
import { kioskService, MAX_FLUSH_BATCH_SIZE } from '../services/kioskService'
import type { QueuedScan } from '../types'

vi.mock('../api/kioskApi', () => ({
  kioskApi: {
    getClockAnchor: vi.fn(),
    scan: vi.fn(),
    flush: vi.fn(),
    pair: vi.fn(),
  },
}))

function fakeQueue() {
  const entries: QueuedScan[] = []
  return {
    entries,
    enqueue: vi.fn((scan: QueuedScan) => {
      entries.push(scan)
      return Promise.resolve()
    }),
    all: vi.fn(() => Promise.resolve([...entries])),
    acknowledge: vi.fn((ids: string[]) => {
      for (const id of ids) {
        const index = entries.findIndex((e) => e.clientEventId === id)
        if (index >= 0) entries.splice(index, 1)
      }
      return Promise.resolve()
    }),
    refreshCount: vi.fn(() => Promise.resolve()),
  }
}

function fakeClock(derived: string | null = '2026-08-10T07:00:00.000Z') {
  return {
    anchorId: { value: 'anchor-1' as string | null },
    setAnchor: vi.fn(),
    deriveOccurredAt: vi.fn(() => derived),
    isAnchorStale: vi.fn(() => false),
  }
}

describe('kioskService.submit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends straight through when the network is up', async () => {
    vi.mocked(kioskApi.scan).mockResolvedValue({
      data: { data: { outcome: 'ACCEPTED', direction: 'CHECK_IN' } },
    } as never)
    const queue = fakeQueue()

    const { queued } = await kioskService.submit('code', fakeClock(), queue)

    expect(queued).toBe(false)
    expect(queue.enqueue).not.toHaveBeenCalled()
  })

  it('queues the scan when the request fails', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()

    const { queued } = await kioskService.submit('code', fakeClock(), queue)

    expect(queued).toBe(true)
    expect(queue.entries).toHaveLength(1)
  })

  it('stamps a queued scan from the server-anchored clock', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()
    const clock = fakeClock('2026-08-10T07:30:00.000Z')

    await kioskService.submit('code', clock, queue)

    expect(clock.deriveOccurredAt).toHaveBeenCalled()
    expect(queue.entries[0]).toMatchObject({
      occurredAt: '2026-08-10T07:30:00.000Z',
      clockAnchorId: 'anchor-1',
    })
  })

  it('does not queue a scan without a trustworthy timestamp', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()

    const response = await kioskService.submit('code', fakeClock(null), queue)

    expect(response.result.outcome).toBe('REJECTED_OFFLINE')
    expect(queue.entries).toEqual([])
  })

  it('gives every scan a distinct retry key', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()
    const clock = fakeClock()

    await kioskService.submit('a', clock, queue)
    await kioskService.submit('b', clock, queue)

    expect(queue.entries[0]?.clientEventId).not.toBe(
      queue.entries[1]?.clientEventId,
    )
  })

  it('does not queue a scan after the clock anchor expires offline', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()
    const clock = fakeClock()
    clock.isAnchorStale.mockReturnValue(true)

    const response = await kioskService.submit('code', clock, queue)

    expect(response.queued).toBe(false)
    expect(response.result.outcome).toBe('REJECTED_OFFLINE')
    expect(response.result.rejectionReason).toMatch(/sinkron/i)
    expect(queue.entries).toEqual([])
  })

  it('does not queue offline without an anchor', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()
    const clock = fakeClock(null)
    clock.anchorId.value = null

    const response = await kioskService.submit('code', clock, queue)

    expect(response.result.outcome).toBe('REJECTED_OFFLINE')
    expect(queue.entries).toEqual([])
  })

  it('does not turn an explicit HTTP failure into an offline success', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue({ response: { status: 403 } })
    const queue = fakeQueue()

    const response = await kioskService.submit('code', fakeClock(), queue)

    expect(response.result.outcome).toBe('REJECTED_ERROR')
    expect(response.queued).toBe(false)
    expect(queue.entries).toEqual([])
  })

  it('shows rejection if the local queue cannot save an offline scan', async () => {
    vi.mocked(kioskApi.scan).mockRejectedValue(new Error('offline'))
    const queue = fakeQueue()
    queue.enqueue.mockRejectedValue(new Error('Antrean lokal gagal diakses'))

    const response = await kioskService.submit('code', fakeClock(), queue)

    expect(response.queued).toBe(false)
    expect(response.result.outcome).toBe('REJECTED_ERROR')
    expect(response.result.rejectionReason).toMatch(/tidak tersimpan/i)
  })

  it('accepts an online response even if the local anchor expired', async () => {
    vi.mocked(kioskApi.scan).mockResolvedValue({
      data: { data: { outcome: 'ACCEPTED', direction: 'CHECK_IN' } },
    } as never)
    const clock = fakeClock()
    clock.isAnchorStale.mockReturnValue(true)

    const response = await kioskService.submit('code', clock, fakeQueue())

    expect(response.result.outcome).toBe('ACCEPTED')
    expect(response.queued).toBe(false)
  })
})

describe('kioskService.flush', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears exactly the entries the server settled', async () => {
    const queue = fakeQueue()
    queue.entries.push(
      { clientEventId: 'e1', code: 'a', occurredAt: null, clockAnchorId: null },
      { clientEventId: 'e2', code: 'b', occurredAt: null, clockAnchorId: null },
    )
    vi.mocked(kioskApi.flush).mockResolvedValue({
      data: {
        data: [
          { clientEventId: 'e1', outcome: 'ACCEPTED', accepted: true },
          { clientEventId: 'e2', outcome: 'ACCEPTED', accepted: true },
        ],
      },
    } as never)

    const result = await kioskService.flush(queue)

    expect(result).toEqual({ sent: 2, cleared: 2 })
    expect(queue.entries).toHaveLength(0)
  })

  it('clears a rejected scan too, because the answer is settled', async () => {
    const queue = fakeQueue()
    queue.entries.push({
      clientEventId: 'e1',
      code: 'revoked',
      occurredAt: null,
      clockAnchorId: null,
    })
    vi.mocked(kioskApi.flush).mockResolvedValue({
      data: {
        data: [
          { clientEventId: 'e1', outcome: 'REJECTED_REVOKED', accepted: true },
        ],
      },
    } as never)

    await kioskService.flush(queue)

    expect(queue.entries).toHaveLength(0)
  })

  it('keeps everything queued when the flush itself fails', async () => {
    const queue = fakeQueue()
    queue.entries.push({
      clientEventId: 'e1',
      code: 'a',
      occurredAt: null,
      clockAnchorId: null,
    })
    vi.mocked(kioskApi.flush).mockRejectedValue(new Error('still offline'))

    const result = await kioskService.flush(queue)

    expect(result).toEqual({ sent: 0, cleared: 0 })
    expect(queue.entries).toHaveLength(1)
    expect(queue.acknowledge).not.toHaveBeenCalled()
  })

  it('drains a four-hour outage in chunks the server will accept', async () => {
    const queue = fakeQueue()
    const depth = 900
    for (let i = 0; i < depth; i++) {
      queue.entries.push({
        clientEventId: `e${i}`,
        code: `card-${i}`,
        occurredAt: null,
        clockAnchorId: null,
      })
    }
    vi.mocked(kioskApi.flush).mockImplementation((scans) =>
      Promise.resolve({
        data: {
          data: scans.map((scan) => ({
            clientEventId: scan.clientEventId,
            outcome: 'ACCEPTED',
            accepted: true,
          })),
        },
      } as never),
    )

    const result = await kioskService.flush(queue)

    expect(result).toEqual({ sent: depth, cleared: depth })
    expect(queue.entries).toHaveLength(0)

    const sizes = vi
      .mocked(kioskApi.flush)
      .mock.calls.map((call) => call[0].length)
    expect(sizes).toEqual([MAX_FLUSH_BATCH_SIZE, depth - MAX_FLUSH_BATCH_SIZE])
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_FLUSH_BATCH_SIZE)
  })

  it('keeps what landed when the connection drops between chunks', async () => {
    const queue = fakeQueue()
    for (let i = 0; i < 700; i++) {
      queue.entries.push({
        clientEventId: `e${i}`,
        code: `card-${i}`,
        occurredAt: null,
        clockAnchorId: null,
      })
    }
    vi.mocked(kioskApi.flush)
      .mockResolvedValueOnce({
        data: {
          data: queue.entries.slice(0, MAX_FLUSH_BATCH_SIZE).map((scan) => ({
            clientEventId: scan.clientEventId,
            outcome: 'ACCEPTED',
            accepted: true,
          })),
        },
      } as never)
      .mockRejectedValueOnce(new Error('dropped mid-drain'))

    const result = await kioskService.flush(queue)

    expect(result).toEqual({
      sent: MAX_FLUSH_BATCH_SIZE,
      cleared: MAX_FLUSH_BATCH_SIZE,
    })
    expect(queue.entries).toHaveLength(200)
  })

  it('does nothing when the queue is empty', async () => {
    const queue = fakeQueue()

    await expect(kioskService.flush(queue)).resolves.toEqual({
      sent: 0,
      cleared: 0,
    })
    expect(kioskApi.flush).not.toHaveBeenCalled()
  })
})

describe('kiosk pairing', () => {
  const store = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    store.clear()
    vi.stubGlobal('localStorage', localStorage)
  })

  it('keeps no device token where page scripts can read it', async () => {
    vi.mocked(kioskApi.pair).mockResolvedValue(undefined as never)

    await expect(kioskService.pair('device-token')).resolves.toBe(true)

    expect(kioskApi.pair).toHaveBeenCalledWith('device-token')
    expect(kioskService.isPaired()).toBe(true)
    expect([...store.values()]).not.toContain('device-token')
  })

  it('stays unpaired when the server refuses the token', async () => {
    vi.mocked(kioskApi.pair).mockRejectedValue(new Error('401'))

    await expect(kioskService.pair('wrong')).resolves.toBe(false)
    expect(kioskService.isPaired()).toBe(false)
  })

  it('moves a token an older release left in localStorage into the cookie', async () => {
    localStorage.setItem('presence_kiosk_device_token', 'old-token')
    vi.mocked(kioskApi.pair).mockResolvedValue(undefined as never)

    expect(kioskService.isPaired()).toBe(true)
    await kioskService.migrateLegacyToken()

    expect(kioskApi.pair).toHaveBeenCalledWith('old-token')
    expect(localStorage.getItem('presence_kiosk_device_token')).toBeNull()
    expect(kioskService.isPaired()).toBe(true)
  })

  it('keeps the old token for the next try while the server is unreachable', async () => {
    localStorage.setItem('presence_kiosk_device_token', 'old-token')
    vi.mocked(kioskApi.pair).mockRejectedValue(new Error('offline'))

    await kioskService.migrateLegacyToken()

    expect(localStorage.getItem('presence_kiosk_device_token')).toBe(
      'old-token',
    )
    expect(kioskService.isPaired()).toBe(true)
  })
})
