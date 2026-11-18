import { BadRequestException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeAttendanceFileRepository } from './attendance-file.repository.fake.js'
import { FakeAttendanceFileStorage } from './attendance-file-storage.fake.js'
import { FakeExamRoomRepository } from './exam-room.repository.fake.js'
import { AttendanceFileService } from './attendance-file.service.js'

const PDF = Buffer.from('%PDF-1.4 scan')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const DAY = '2026-11-18'
const ACTOR = '99999999-9999-4999-8999-999999999999'
const NOW = new Date('2026-11-18T05:00:00Z')

async function setup() {
  const rooms = new FakeExamRoomRepository()
  const repository = new FakeAttendanceFileRepository()
  const storage = new FakeAttendanceFileStorage()
  const service = new AttendanceFileService(rooms, repository, storage)
  const event = await rooms.createEvent({
    semesterId: ACTOR,
    name: 'PAS',
    type: 'PAS',
    startsAt: new Date('2026-11-17T00:00:00Z'),
    endsAt: new Date('2026-11-30T00:00:00Z'),
    createdById: ACTOR,
  } as never)
  const room = await rooms.createRoom({
    eventId: event.id,
    code: 'R-01',
    name: 'Ruang 1',
    capacity: 20,
  })
  const slot = await rooms.assignSupervisor({
    roomId: room.id,
    startsAt: new Date('2026-11-17T18:30:00Z'),
    endsAt: new Date('2026-11-17T19:30:00Z'),
    scheduledUserId: ACTOR,
  })
  return { rooms, repository, storage, service, event, room, slot }
}

const file = (buffer: Buffer) => ({ buffer, originalName: 'scan.pdf' })

describe('AttendanceFileService', () => {
  let ctx: Awaited<ReturnType<typeof setup>>
  beforeEach(async () => {
    ctx = await setup()
  })

  it('stores a student sheet per room and slot, day taken in WIB', async () => {
    const saved = await ctx.service.upload(
      ctx.event.id,
      ACTOR,
      {
        kind: 'STUDENT',
        day: DAY,
        roomId: ctx.room.id,
        slotId: ctx.slot.id,
        file: file(PDF),
      },
      NOW,
    )

    expect(saved).toMatchObject({
      kind: 'STUDENT',
      roomId: ctx.room.id,
      slotId: ctx.slot.id,
      mimeType: 'application/pdf',
    })
    expect(saved.storageKey).toMatch(/^exam\/attendance\//)
    expect(ctx.rooms.auditLogs.at(-1)).toMatchObject({
      action: 'UPLOAD_ATTENDANCE_FILE',
      roomId: ctx.room.id,
    })
    expect(JSON.stringify(ctx.rooms.auditLogs.at(-1))).not.toContain('%PDF')
  })

  it('rejects a student sheet whose day is not the slot day', async () => {
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'STUDENT',
        day: '2026-11-17',
        roomId: ctx.room.id,
        slotId: ctx.slot.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(ctx.storage.objects.size).toBe(0)
  })

  it('rejects a student sheet without roomId or slotId', async () => {
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'STUDENT',
        day: DAY,
        roomId: ctx.room.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'STUDENT',
        day: DAY,
        slotId: ctx.slot.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('404s a slot or room of another event', async () => {
    const other = await ctx.rooms.createEvent({
      semesterId: ACTOR,
      name: 'PTS',
      type: 'PTS',
      startsAt: new Date(),
      endsAt: new Date(),
      createdById: ACTOR,
    } as never)
    await expect(
      ctx.service.upload(other.id, ACTOR, {
        kind: 'STUDENT',
        day: DAY,
        roomId: ctx.room.id,
        slotId: ctx.slot.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'STUDENT',
        day: DAY,
        roomId: ctx.room.id,
        slotId: '11111111-1111-4111-8111-111111111111',
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('404s an unknown event', async () => {
    await expect(
      ctx.service.upload('11111111-1111-4111-8111-111111111111', ACTOR, {
        kind: 'SUPERVISOR',
        day: DAY,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('stores a supervisor sheet per day and 400s a day without slots', async () => {
    const saved = await ctx.service.upload(ctx.event.id, ACTOR, {
      kind: 'SUPERVISOR',
      day: DAY,
      file: file(PDF),
    })
    expect(saved.roomId).toBeNull()
    expect(saved.slotId).toBeNull()
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: '2026-11-19',
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: DAY,
        roomId: ctx.room.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects a malformed day', async () => {
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: '2026-02-31',
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('stores a technician sheet per room and day, needing a room and no slot', async () => {
    const saved = await ctx.service.upload(ctx.event.id, ACTOR, {
      kind: 'TECHNICIAN',
      day: DAY,
      roomId: ctx.room.id,
      file: file(PDF),
    })
    expect(saved).toMatchObject({ roomId: ctx.room.id, slotId: null })
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'TECHNICIAN',
        day: DAY,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'TECHNICIAN',
        day: DAY,
        roomId: ctx.room.id,
        slotId: ctx.slot.id,
        file: file(PDF),
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('upserts: a re-upload replaces the row and deletes the old object', async () => {
    const input = {
      kind: 'TECHNICIAN' as const,
      day: DAY,
      roomId: ctx.room.id,
    }
    const first = await ctx.service.upload(ctx.event.id, ACTOR, {
      ...input,
      file: file(PDF),
    })
    const second = await ctx.service.upload(ctx.event.id, ACTOR, {
      ...input,
      file: file(PNG),
    })

    expect(second.id).toBe(first.id)
    expect(second.mimeType).toBe('image/png')
    expect(ctx.repository.rows.size).toBe(1)
    expect([...ctx.storage.objects.keys()]).toEqual([second.storageKey])
  })

  it('keeps the old file when deleting it fails', async () => {
    const input = {
      kind: 'TECHNICIAN' as const,
      day: DAY,
      roomId: ctx.room.id,
    }
    await ctx.service.upload(ctx.event.id, ACTOR, { ...input, file: file(PDF) })
    ctx.storage.failDelete = true
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, { ...input, file: file(PNG) }),
    ).resolves.toMatchObject({ mimeType: 'image/png' })
  })

  it('deletes the new object when the row cannot be saved', async () => {
    ctx.repository.failUpsert = true
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: DAY,
        file: file(PDF),
      }),
    ).rejects.toThrow('db down')
    expect(ctx.storage.objects.size).toBe(0)
  })

  it('rejects a file that is not PDF, JPG or PNG by its bytes', async () => {
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: DAY,
        file: { buffer: Buffer.from('MZ evil.exe'), originalName: 'a.pdf' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      ctx.service.upload(ctx.event.id, ACTOR, {
        kind: 'SUPERVISOR',
        day: DAY,
        file: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(ctx.storage.objects.size).toBe(0)
  })

  it('lists by kind and day, and opens a file with its room code', async () => {
    const saved = await ctx.service.upload(ctx.event.id, ACTOR, {
      kind: 'TECHNICIAN',
      day: DAY,
      roomId: ctx.room.id,
      file: file(PDF),
    })
    await ctx.service.upload(ctx.event.id, ACTOR, {
      kind: 'SUPERVISOR',
      day: DAY,
      file: file(PDF),
    })

    expect(
      await ctx.service.list(ctx.event.id, { kind: 'TECHNICIAN', day: DAY }),
    ).toHaveLength(1)
    expect(await ctx.service.list(ctx.event.id, { day: '2026-11-19' })).toEqual(
      [],
    )
    const opened = await ctx.service.open(ctx.event.id, saved.id)
    expect(opened.roomCode).toBe('R-01')
    await expect(
      ctx.service.open(ctx.event.id, '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
