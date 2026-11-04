import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QueuedScan } from '../types'
import { useScanQueue } from './useScanQueue'

function memoryIndexedDB() {
  const scans = new Map<string, QueuedScan>()
  let ready = false
  let failNext = false
  let failCommit = false

  function request<T>(run: () => T) {
    const pending = { result: undefined as T, onsuccess: null, onerror: null }
    queueMicrotask(() => {
      if (failNext) {
        failNext = false
        ;(pending.onerror as (() => void) | null)?.()
        return
      }
      pending.result = run()
      ;(pending.onsuccess as (() => void) | null)?.()
    })
    return pending as unknown as IDBRequest<T>
  }

  const store = {
    put: (scan: QueuedScan) =>
      request(() => scans.set(scan.clientEventId, scan)),
    getAll: () => request(() => [...scans.values()]),
    delete: (id: string) => request(() => scans.delete(id)),
    count: () => request(() => scans.size),
  }
  const database = {
    objectStoreNames: { contains: () => ready },
    createObjectStore: () => {
      ready = true
    },
    transaction: (_name: string, mode: IDBTransactionMode) => {
      const previous = new Map(scans)
      const transaction = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null as (() => void) | null,
        objectStore: () => store,
      }
      queueMicrotask(() =>
        queueMicrotask(() => {
          if (mode === 'readwrite' && failCommit) {
            failCommit = false
            scans.clear()
            for (const [id, scan] of previous) scans.set(id, scan)
            transaction.onabort?.()
          } else {
            transaction.oncomplete?.()
          }
        }),
      )
      return transaction
    },
  }
  const open = vi.fn(() => {
    const pending = { result: database, onupgradeneeded: null, onsuccess: null }
    queueMicrotask(() => {
      if (!ready) (pending.onupgradeneeded as (() => void) | null)?.()
      ;(pending.onsuccess as (() => void) | null)?.()
    })
    return pending as unknown as IDBOpenDBRequest
  })
  vi.stubGlobal('indexedDB', { open })
  return {
    scans,
    open,
    failOnce: () => {
      failNext = true
    },
    abortNextWrite: () => {
      failCommit = true
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useScanQueue', () => {
  it('persists scans across instances and acknowledges only settled ids', async () => {
    const db = memoryIndexedDB()
    const first = useScanQueue()
    const second = useScanQueue()
    const event = (id: string): QueuedScan => ({
      clientEventId: id,
      code: id,
      occurredAt: null,
      clockAnchorId: null,
    })

    await first.enqueue(event('one'))
    await first.enqueue(event('two'))
    await first.enqueue(event('two'))
    expect(first.pendingCount.value).toBe(2)
    expect(await second.all()).toEqual([event('one'), event('two')])

    await second.acknowledge(['one'])
    expect(await first.all()).toEqual([event('two')])
    expect(second.pendingCount.value).toBe(1)
    expect(db.open).toHaveBeenCalledTimes(2)
  })

  it('keeps a pending scan when the delete request fails', async () => {
    const db = memoryIndexedDB()
    const queue = useScanQueue()
    await queue.enqueue({
      clientEventId: 'one',
      code: 'A',
      occurredAt: null,
      clockAnchorId: null,
    })

    db.failOnce()
    await expect(queue.acknowledge(['one'])).rejects.toThrow(
      'Antrean lokal gagal diakses',
    )
    expect(db.scans.has('one')).toBe(true)
  })

  it('does not report a scan as saved if its write transaction aborts', async () => {
    const db = memoryIndexedDB()
    const queue = useScanQueue()
    db.abortNextWrite()

    await expect(
      queue.enqueue({
        clientEventId: 'one',
        code: 'A',
        occurredAt: null,
        clockAnchorId: null,
      }),
    ).rejects.toThrow('Antrean lokal gagal diakses')
    expect(await queue.all()).toEqual([])
    expect(queue.pendingCount.value).toBe(0)
  })
})
