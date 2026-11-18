import 'reflect-metadata'
import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { ExamAttendanceFileController } from './exam-attendance-file.controller.js'

const ID = '11111111-1111-4111-8111-111111111111'

describe('ExamAttendanceFileController', () => {
  it.each(['upload', 'list', 'download'] as const)(
    '%s requires exam-events.manage',
    (method) => {
      const handler = ExamAttendanceFileController.prototype[
        method
      ] as unknown as object
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        'exam-events.manage',
      ])
    },
  )

  it('serves the file as an attachment with a safe name', async () => {
    const open = vi.fn().mockResolvedValue({
      stream: Readable.from(Buffer.from('%PDF-1.4')),
      file: {
        kind: 'STUDENT',
        mimeType: 'application/pdf',
        sizeBytes: 8,
        uploadedAt: new Date('2026-11-02T02:05:00Z'),
      },
      roomCode: 'R-01/../x',
    })
    const controller = new ExamAttendanceFileController({ open } as never)
    const set = vi.fn()

    await controller.download(ID, ID, { set } as never)

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'attachment; filename="daftar-hadir-peserta-R-01x-20261102-0905.pdf"',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      }),
    )
  })

  it('names a supervisor sheet without a room', async () => {
    const open = vi.fn().mockResolvedValue({
      stream: Readable.from(Buffer.from('x')),
      file: {
        kind: 'SUPERVISOR',
        mimeType: 'image/png',
        sizeBytes: 1,
        uploadedAt: new Date('2026-11-02T02:05:00Z'),
      },
      roomCode: null,
    })
    const controller = new ExamAttendanceFileController({ open } as never)
    const set = vi.fn()
    await controller.download(ID, ID, { set } as never)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Disposition':
          'attachment; filename="daftar-hadir-pengawas-20261102-0905.png"',
      }),
    )
  })
})
