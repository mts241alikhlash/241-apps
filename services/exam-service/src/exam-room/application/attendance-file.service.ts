import { randomUUID } from 'node:crypto'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import type {
  AttendanceFile,
  AttendanceKind,
} from '../domain/entities/attendance-file.entity.js'
import {
  isCalendarDay,
  wibDay,
} from '../domain/policies/attendance-scope.policy.js'
import {
  detectReportFile,
  REPORT_FILE_MAX_BYTES,
} from '../domain/policies/report-file.policy.js'
import { IAttendanceFileRepository } from '../domain/repositories/attendance-file.repository.js'
import { IAttendanceFileStorage } from '../domain/repositories/attendance-file-storage.js'
import { IExamRoomRepository } from '../domain/repositories/exam-room.repository.js'

export interface AttendanceUploadInput {
  kind: AttendanceKind
  day: string
  roomId?: string
  slotId?: string
  file: { buffer: Buffer; originalName: string } | undefined
}

@Injectable()
export class AttendanceFileService {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly repository: IAttendanceFileRepository,
    private readonly storage: IAttendanceFileStorage,
  ) {}

  async upload(
    eventId: string,
    actorId: string,
    input: AttendanceUploadInput,
    now: Date = new Date(),
  ): Promise<AttendanceFile> {
    await this.assertEvent(eventId)
    const { roomId, slotId } = await this.validateScope(eventId, input)
    const { file } = input
    if (file === undefined || file.buffer.length === 0) {
      throw new BadRequestException('Berkas daftar hadir wajib diunggah')
    }
    if (file.buffer.length > REPORT_FILE_MAX_BYTES) {
      throw new PayloadTooLargeException('Ukuran berkas maksimal 10 MB')
    }
    const detected = detectReportFile(file.buffer)
    if (detected === null) {
      throw new BadRequestException('Berkas harus PDF, JPG, atau PNG')
    }
    const storageKey = await this.storage.put(
      randomUUID(),
      file.buffer,
      detected.mimeType,
    )
    let saved: { file: AttendanceFile; previous: AttendanceFile | null }
    try {
      saved = await this.repository.upsert({
        eventId,
        kind: input.kind,
        roomId,
        slotId,
        day: input.day,
        storageKey,
        mimeType: detected.mimeType,
        sizeBytes: file.buffer.length,
        originalName: file.originalName.slice(0, 255),
        uploadedById: actorId,
        uploadedAt: now,
      })
    } catch (error) {
      await this.discard(storageKey)
      throw error
    }
    if (saved.previous !== null) await this.discard(saved.previous.storageKey)
    await this.rooms.writeAuditLog({
      roomId,
      action: 'UPLOAD_ATTENDANCE_FILE',
      actorId,
      reason: `Daftar hadir ${input.kind} ${input.day}`,
      metadata: {
        eventId,
        kind: input.kind,
        day: input.day,
        slotId,
        replaced: saved.previous !== null,
        fileMimeType: detected.mimeType,
        fileSizeBytes: file.buffer.length,
      },
    })
    return saved.file
  }

  async list(
    eventId: string,
    filter: { kind?: AttendanceKind; day?: string },
  ): Promise<AttendanceFile[]> {
    await this.assertEvent(eventId)
    return this.repository.list(eventId, filter)
  }

  async open(eventId: string, fileId: string) {
    const file = await this.repository.findById(eventId, fileId)
    if (file === null) throw new NotFoundException('Berkas tidak ditemukan')
    const room =
      file.roomId === null ? null : await this.rooms.findRoomById(file.roomId)
    const { stream } = await this.storage.read(file.storageKey)
    return { stream, file, roomCode: room?.code ?? null }
  }

  private async assertEvent(eventId: string): Promise<void> {
    if ((await this.rooms.findEventById(eventId)) === null) {
      throw new NotFoundException('Acara ujian tidak ditemukan')
    }
  }

  private async validateScope(
    eventId: string,
    input: AttendanceUploadInput,
  ): Promise<{ roomId: string | null; slotId: string | null }> {
    if (!isCalendarDay(input.day)) {
      throw new BadRequestException('Tanggal harus berformat YYYY-MM-DD')
    }
    if (input.kind === 'SUPERVISOR') {
      if (input.roomId !== undefined || input.slotId !== undefined) {
        throw new BadRequestException(
          'Daftar hadir pengawas hanya per hari, tanpa ruang dan jam',
        )
      }
      const rooms = await this.rooms.listRoomsByEvent(eventId)
      for (const room of rooms) {
        const slots = await this.rooms.listSupervisors(room.id)
        if (slots.some((slot) => wibDay(slot.startsAt) === input.day)) {
          return { roomId: null, slotId: null }
        }
      }
      throw new BadRequestException(
        'Tidak ada jadwal pengawasan pada tanggal ini',
      )
    }
    if (input.roomId === undefined) {
      throw new BadRequestException('Ruang wajib diisi')
    }
    const room = await this.rooms.findRoomById(input.roomId)
    if (room?.eventId !== eventId) {
      throw new NotFoundException('Ruang tidak ditemukan di acara ini')
    }
    if (input.kind === 'TECHNICIAN') {
      if (input.slotId !== undefined) {
        throw new BadRequestException(
          'Daftar hadir teknisi hanya per ruang dan hari, tanpa jam',
        )
      }
      return { roomId: room.id, slotId: null }
    }
    if (input.slotId === undefined) {
      throw new BadRequestException('Jam pengawasan wajib diisi')
    }
    const slot = await this.rooms.findSupervisorById(input.slotId)
    if (slot?.roomId !== room.id) {
      throw new NotFoundException('Jadwal pengawasan tidak ditemukan')
    }
    if (wibDay(slot.startsAt) !== input.day) {
      throw new BadRequestException(
        'Tanggal tidak sesuai dengan jadwal pengawasan',
      )
    }
    return { roomId: room.id, slotId: slot.id }
  }

  private async discard(storageKey: string): Promise<void> {
    try {
      await this.storage.delete(storageKey)
    } catch {
      return
    }
  }
}
