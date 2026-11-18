// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ReportSubmitDialogs from './ReportSubmitDialogs.vue'
import { useReportSubmission } from '../composables/useReportSubmission'
import type { RoomReportSummary } from '../types'

const room = (id: number): RoomReportSummary => ({
  roomId: `r${id}`,
  roomCode: `R${id}`,
  roomName: `Ruang ${id}`,
  slotId: 's1',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-02T02:00:00.000Z',
  status: 'DRAFT',
  registeredCount: 10,
  reportId: null,
  hasAttachment: false,
  attachmentName: null,
  subjectNames: ['Matematika'],
  supervisorName: null,
})

const confirmButton = () =>
  [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Serahkan',
  )

describe('ReportSubmitDialogs', () => {
  it('lists every draft room and keeps Serahkan disabled until each has a file', async () => {
    const submission = useReportSubmission({
      submit: vi.fn(),
      refresh: vi.fn(),
    })
    const rows = [room(1), room(2)]
    const wrapper = mount(ReportSubmitDialogs, {
      props: { submission },
      attachTo: document.body,
    })
    submission.request(rows)
    await flushPromises()

    expect(document.body.textContent).toContain('Ruang 1')
    expect(document.body.textContent).toContain('Ruang 2')
    expect(confirmButton()?.disabled).toBe(true)

    submission.setFile(rows[0], new File(['%PDF-'], 'a.pdf'))
    await flushPromises()
    expect(confirmButton()?.disabled).toBe(true)

    submission.setFile(rows[1], new File(['%PDF-'], 'b.pdf'))
    await flushPromises()
    expect(confirmButton()?.disabled).toBe(false)
    wrapper.unmount()
  })
})
