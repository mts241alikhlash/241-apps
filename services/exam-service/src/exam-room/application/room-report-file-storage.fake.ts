import { Readable } from 'node:stream'
import type { ExamRoomReportAttachment } from '../domain/entities/exam-room-report.entity.js'
import { IRoomReportFileStorage } from '../domain/repositories/room-report-file-storage.js'

export const SAMPLE_ATTACHMENT: ExamRoomReportAttachment = {
  storageKey: 'exam/room-reports/sample',
  mimeType: 'application/pdf',
  sizeBytes: 20,
  originalName: 'scan.pdf',
  uploadedById: 'sup-1',
  uploadedAt: new Date('2026-11-02T02:00:00Z'),
}

export class FakeRoomReportFileStorage extends IRoomReportFileStorage {
  readonly objects = new Map<string, { content: Buffer; mimeType: string }>()

  put(fileId: string, content: Buffer, mimeType: string) {
    const key = `exam/room-reports/${fileId}`
    this.objects.set(key, { content, mimeType })
    return Promise.resolve(key)
  }

  read(storageKey: string) {
    const object = this.objects.get(storageKey)
    if (!object) return Promise.reject(new Error(`no object ${storageKey}`))
    return Promise.resolve({ stream: Readable.from(object.content) })
  }

  delete(storageKey: string) {
    this.objects.delete(storageKey)
    return Promise.resolve()
  }
}
