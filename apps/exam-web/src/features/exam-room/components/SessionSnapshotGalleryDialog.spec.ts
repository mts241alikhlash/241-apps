// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SessionSnapshotGalleryDialog from './SessionSnapshotGalleryDialog.vue'

const { loadEvidence, loadSnapshotImage, loadLatestSnapshot } = vi.hoisted(
  () => ({
    loadEvidence: vi.fn(),
    loadSnapshotImage: vi.fn(),
    loadLatestSnapshot: vi.fn(),
  }),
)

vi.mock('../services/examRoomService', () => ({
  examRoomService: { loadEvidence, loadSnapshotImage, loadLatestSnapshot },
}))

const passthrough = { template: '<div><slot /></div>' }
const dialog = {
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
}

const createObjectURL = vi.fn(
  (_blob: Blob) => `blob:evidence-${createObjectURL.mock.calls.length}`,
)
const revokeObjectURL = vi.fn()

function deferred() {
  let settle: ((value: unknown) => void) | null = null
  const promise = new Promise<unknown>((resolve) => {
    settle = resolve
  })
  return { promise, resolve: (value: unknown) => settle?.(value) }
}

const evidence = (id: string) => ({
  id,
  sessionId: 's1',
  kind: 'PERIODIC_EVIDENCE',
  sizeBytes: 12_000,
  capturedAt: '2026-11-02T01:00:00.000Z',
  expiresAt: '2026-11-04T01:00:00.000Z',
  createdAt: '2026-11-02T01:00:00.000Z',
})

beforeEach(() => {
  loadEvidence.mockReset()
  loadSnapshotImage.mockReset()
  loadLatestSnapshot.mockReset()
  loadLatestSnapshot.mockResolvedValue(null)
  loadSnapshotImage.mockResolvedValue(
    new Blob(['jpeg'], { type: 'image/jpeg' }),
  )
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

function mountDialog(open = true) {
  return mount(SessionSnapshotGalleryDialog, {
    props: { open, sessionId: 's1', studentName: 'Ahmad Fauzi' },
    global: {
      stubs: {
        Dialog: dialog,
        DialogBody: passthrough,
        DialogContent: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        Button: passthrough,
      },
    },
  })
}

describe('SessionSnapshotGalleryDialog', () => {
  it('renders one image per evidence row', async () => {
    loadEvidence.mockResolvedValue({
      success: true,
      data: [evidence('e1'), evidence('e2')],
    })
    const wrapper = mountDialog()
    await flushPromises()

    expect(loadEvidence).toHaveBeenCalledWith('s1')
    expect(wrapper.findAll('[data-testid="evidence-image"]')).toHaveLength(2)
  })

  it('shows the empty state when the session kept no evidence', async () => {
    loadEvidence.mockResolvedValue({ success: true, data: [] })
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.text()).toContain('Belum ada foto bukti')
  })

  it('shows the service error instead of an empty gallery', async () => {
    loadEvidence.mockResolvedValue({ success: false, error: 'Ditolak.' })
    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.text()).toContain('Ditolak.')
    expect(loadSnapshotImage).not.toHaveBeenCalled()
  })

  it('revokes every object URL when it closes', async () => {
    loadEvidence.mockResolvedValue({ success: true, data: [evidence('e1')] })
    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.setProps({ open: false })
    await flushPromises()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:evidence-1')
  })

  it('installs nothing when it closes mid-flight', async () => {
    const pending = deferred()
    loadEvidence.mockImplementationOnce(() => pending.promise)
    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.setProps({ open: false })
    await flushPromises()
    pending.resolve({ success: true, data: [evidence('e1')] })
    await flushPromises()

    expect(loadSnapshotImage).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="evidence-image"]')).toHaveLength(0)
  })

  it('shows only the second seat when it is reopened for another student', async () => {
    const pendingFirst = deferred()
    loadEvidence
      .mockImplementationOnce(() => pendingFirst.promise)
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...evidence('e2'), kind: 'SESSION_START' }],
      })
    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.setProps({
      sessionId: 's2',
      studentName: 'Siti Aminah',
    })
    await flushPromises()
    pendingFirst.resolve({
      success: true,
      data: [{ ...evidence('e1'), kind: 'PERIODIC_EVIDENCE' }],
    })
    await flushPromises()

    expect(loadEvidence).toHaveBeenLastCalledWith('s2')
    expect(wrapper.findAll('[data-testid="evidence-image"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Mulai ujian')
    expect(wrapper.text()).not.toContain('Sampel berkala')
    expect(wrapper.text()).toContain('Siti Aminah')
  })
})
