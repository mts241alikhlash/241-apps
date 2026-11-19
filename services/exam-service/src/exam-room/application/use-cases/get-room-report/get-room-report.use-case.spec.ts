import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../room-access.service.js'
import { RoomReportService } from '../../room-report.service.js'
import {
  FOREIGN_STUDENT_ID,
  MONITOR_NOW,
  OTHER_SUPERVISOR_ID,
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  type MonitorFixture,
  scheduleOf,
  seedMonitorRoom,
  startSession,
} from '../../room-monitor.test-support.js'
import {
  FakeRoomReportFileStorage,
  SAMPLE_ATTACHMENT,
} from '../../room-report-file-storage.fake.js'
import { GetRoomReportUseCase } from '../get-room-report/get-room-report.use-case.js'
import { SaveRoomReportUseCase } from '../save-room-report/save-room-report.use-case.js'
import { SubmitRoomReportUseCase } from '../submit-room-report/submit-room-report.use-case.js'
import { VerifyRoomReportUseCase } from '../verify-room-report/verify-room-report.use-case.js'

const PDF_FILE = {
  buffer: Buffer.from('%PDF-1.4 berita acara'),
  originalName: 'scan.pdf',
}

const SUPERVISOR_USER: RoomStaffUser = {
  id: SUPERVISOR_ID,
  permissions: [SUPERVISE],
}
const COORDINATOR: RoomStaffUser = {
  id: 'koord-1',
  permissions: [MANAGE_ALL],
}

interface Reports {
  fixture: MonitorFixture
  get: GetRoomReportUseCase
  save: SaveRoomReportUseCase
  submit: SubmitRoomReportUseCase
  verify: VerifyRoomReportUseCase
  files: FakeRoomReportFileStorage
}

async function build(): Promise<Reports> {
  const fixture = await seedMonitorRoom(6)
  startSession(fixture, fixture.studentIds[0], { syncedAnswerCount: 30 })
  startSession(fixture, fixture.studentIds[1], {
    status: 'SUBMITTED',
    submittedAt: MONITOR_NOW,
  })
  fixture.rooms.auditLogs.push(
    {
      id: 'audit-in-window',
      sessionId: 'ses-x',
      roomId: fixture.room.id,
      scheduleId: fixture.schedule.id,
      action: 'REOPEN_SESSION',
      actorId: TECHNICIAN_ID,
      reason: 'Siswa kehabisan baterai',
      metadata: {},
      createdAt: new Date('2026-11-02T02:00:00.000Z'),
    },
    {
      id: 'audit-outside-window',
      sessionId: 'ses-y',
      roomId: fixture.room.id,
      scheduleId: fixture.schedule.id,
      action: 'RESET_SESSION',
      actorId: TECHNICIAN_ID,
      reason: 'Sesi kemarin',
      metadata: {},
      createdAt: new Date('2026-10-30T02:00:00.000Z'),
    },
  )
  const files = new FakeRoomReportFileStorage()
  const reports = new RoomReportService(
    fixture.rooms,
    fixture.schedules,
    fixture.sessions,
    new RoomAccessService(fixture.rooms),
    files,
  )
  return {
    fixture,
    files,
    get: new GetRoomReportUseCase(
      fixture.rooms,
      fixture.sessions,
      fixture.schedules,
      fixture.students,
      fixture.academic,
      reports,
    ),
    save: new SaveRoomReportUseCase(reports),
    submit: new SubmitRoomReportUseCase(reports),
    verify: new VerifyRoomReportUseCase(reports),
  }
}

describe('GetRoomReportUseCase', () => {
  it('auto-aggregates attendance, absences, field notes, and audit logs', async () => {
    const { fixture, get, save } = await build()
    await save.recordAbsence(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      {
        studentId: fixture.studentIds[5],
        scheduleId: scheduleOf(fixture, fixture.studentIds[5]).id,
        reason: 'SICK',
        note: 'Demam tinggi',
      },
      MONITOR_NOW,
    )
    await save.recordFieldNote(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      {
        studentId: fixture.studentIds[0],
        category: 'PHYSICAL',
        note: 'Membawa catatan kecil',
      },
      MONITOR_NOW,
    )

    const report = await get.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
    )

    expect(report.status).toBe('DRAFT')
    expect(report.schedules).toHaveLength(2)
    const byClassroom = new Map(
      report.schedules.map((row) => [row.classroomName, row]),
    )
    expect(byClassroom.get('VII A')).toMatchObject({
      packageTitle: 'UAS Matematika',
      registeredCount: 2,
      startedCount: 1,
      submittedCount: 0,
      absentCount: 0,
    })
    expect(byClassroom.get('VIII A')).toMatchObject({
      registeredCount: 4,
      startedCount: 1,
      submittedCount: 1,
      absentCount: 1,
    })
    expect(report.absences).toEqual([
      expect.objectContaining({
        studentId: fixture.studentIds[5],
        studentName: 'Siswa 6',
        reason: 'SICK',
        note: 'Demam tinggi',
      }),
    ])
    expect(report.fieldNotes).toEqual([
      expect.objectContaining({
        category: 'PHYSICAL',
        note: 'Membawa catatan kecil',
      }),
    ])
    expect(report.auditLogs.map((row) => row.action)).toEqual([
      'REOPEN_SESSION',
    ])
    expect(report.auditLogs.map((row) => row.id)).not.toContain(
      'audit-outside-window',
    )
  })

  it('creates the draft once and reuses it', async () => {
    const { fixture, get } = await build()

    const first = await get.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
    )
    const second = await get.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
    )

    expect(second.reportId).toBe(first.reportId)
    expect(fixture.rooms.reports.size).toBe(1)
  })

  it('refuses a supervisor of another room and an unknown slot', async () => {
    const { fixture, get } = await build()

    await expect(
      get.execute(
        { id: OTHER_SUPERVISOR_ID, permissions: [SUPERVISE] },
        fixture.room.id,
        fixture.slotId,
      ),
    ).rejects.toThrow(ForbiddenException)

    await expect(
      get.execute(
        COORDINATOR,
        fixture.room.id,
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrow(NotFoundException)
  })
})

describe('SaveRoomReportUseCase', () => {
  it('saves the draft for the supervisor on duty', async () => {
    const { fixture, save } = await build()

    const saved = await save.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      { condition: 'TECHNICAL_ISSUE', incidentNotes: 'Proyektor mati' },
      MONITOR_NOW,
    )

    expect(saved).toMatchObject({
      status: 'DRAFT',
      condition: 'TECHNICAL_ISSUE',
      incidentNotes: 'Proyektor mati',
    })
  })

  it('refuses a technician who does not run the room', async () => {
    const { fixture, save } = await build()

    await expect(
      save.execute(
        { id: 'tech-9', permissions: [TECHNICIAN] },
        fixture.room.id,
        fixture.slotId,
        { condition: 'SMOOTH' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})

const JPG_FILE = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]),
  originalName: 'scan.jpg',
}
const PNG_FILE = {
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
  originalName: 'scan.png',
}

describe('SubmitRoomReportUseCase file', () => {
  it.each([
    ['pdf', PDF_FILE, 'application/pdf'],
    ['jpg', JPG_FILE, 'image/jpeg'],
    ['png', PNG_FILE, 'image/png'],
  ])(
    'accepts a %s and stores the attachment with the status',
    async (_n, file, mime) => {
      const { fixture, submit, files } = await build()
      const submitted = await submit.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        file,
        MONITOR_NOW,
      )
      expect(submitted.status).toBe('SUBMITTED')
      expect(submitted.attachment).toMatchObject({
        mimeType: mime,
        sizeBytes: file.buffer.length,
        originalName: file.originalName,
        uploadedById: SUPERVISOR_USER.id,
      })
      expect(submitted.attachment?.storageKey).not.toContain(file.originalName)
      expect(files.objects.size).toBe(1)
    },
  )

  it('rejects a text file named .pdf with 400 and stores nothing', async () => {
    const { fixture, submit, files } = await build()
    await expect(
      submit.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        { buffer: Buffer.from('bukan pdf'), originalName: 'fake.pdf' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow('Berkas harus PDF, JPG, atau PNG')
    expect(files.objects.size).toBe(0)
    const view = await fixture.rooms.findReportBySlot(
      fixture.room.id,
      fixture.slotId,
    )
    expect(view?.status).toBe('DRAFT')
  })

  it('rejects a file over 10 MB with 413', async () => {
    const { fixture, submit } = await build()
    const big = Buffer.alloc(10 * 1024 * 1024 + 1)
    PDF_FILE.buffer.copy(big)
    await expect(
      submit.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        { buffer: big, originalName: 'big.pdf' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(PayloadTooLargeException)
  })

  it('requires a file', async () => {
    const { fixture, submit } = await build()
    await expect(
      submit.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        undefined,
        MONITOR_NOW,
      ),
    ).rejects.toThrow('Berkas berita acara wajib diunggah')
  })

  it('deletes the stored object when the status transition loses a race', async () => {
    const { fixture, files } = await build()
    const reports = new RoomReportService(
      fixture.rooms,
      fixture.schedules,
      fixture.sessions,
      new RoomAccessService(fixture.rooms),
      files,
    )
    const context = await reports.loadEditable(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )
    await fixture.rooms.submitReport(
      context.report.id,
      SUPERVISOR_ID,
      MONITOR_NOW,
      SAMPLE_ATTACHMENT,
    )
    await expect(
      reports.submit(context, SUPERVISOR_ID, MONITOR_NOW, PDF_FILE),
    ).rejects.toThrow(ConflictException)
    expect(files.objects.size).toBe(0)
  })

  it('lets only a coordinator replace the file of a submitted report', async () => {
    const { fixture, submit, files, verify } = await build()
    await expect(
      submit.replaceFile(
        COORDINATOR,
        fixture.room.id,
        fixture.slotId,
        JPG_FILE,
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
    const submitted = await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )
    await expect(
      submit.replaceFile(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        JPG_FILE,
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)

    const replaced = await submit.replaceFile(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      JPG_FILE,
      MONITOR_NOW,
    )
    expect(replaced.attachment?.mimeType).toBe('image/jpeg')
    expect(files.objects.has(submitted.attachment?.storageKey ?? '')).toBe(
      false,
    )
    expect(files.objects.size).toBe(1)

    await verify.execute(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )
    await expect(
      submit.replaceFile(
        COORDINATOR,
        fixture.room.id,
        fixture.slotId,
        PNG_FILE,
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('opens the file for download and 404s when none', async () => {
    const { fixture, submit } = await build()
    await expect(
      submit.download(SUPERVISOR_USER, fixture.room.id, fixture.slotId),
    ).rejects.toThrow(NotFoundException)
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )
    const opened = await submit.download(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
    )
    expect(opened.attachment.mimeType).toBe('application/pdf')
  })
})

describe('SubmitRoomReportUseCase', () => {
  it('locks the report and refuses further edits with 409', async () => {
    const { fixture, submit, save } = await build()

    const submitted = await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )
    expect(submitted.status).toBe('SUBMITTED')

    await expect(
      save.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        { incidentNotes: 'telat' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
    await expect(
      save.recordAbsence(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: fixture.studentIds[1],
          scheduleId: scheduleOf(fixture, fixture.studentIds[1]).id,
          reason: 'ABSENT',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
    await expect(
      submit.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        PDF_FILE,
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('lets a coordinator reopen a submitted report and edit again', async () => {
    const { fixture, submit, save } = await build()
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )

    const reopened = await save.execute(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      { reopen: true, incidentNotes: 'Diperbaiki koordinator' },
      MONITOR_NOW,
    )

    expect(reopened).toMatchObject({
      status: 'DRAFT',
      incidentNotes: 'Diperbaiki koordinator',
    })
  })

  it('refuses a supervisor reopening their own report', async () => {
    const { fixture, submit, save } = await build()
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )

    await expect(
      save.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        { reopen: true },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
  })
})

describe('VerifyRoomReportUseCase', () => {
  it('verifies a submitted report and refuses an unsubmitted one', async () => {
    const { fixture, submit, verify } = await build()

    await expect(
      verify.execute(COORDINATOR, fixture.room.id, fixture.slotId, MONITOR_NOW),
    ).rejects.toThrow(ConflictException)

    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )
    const verified = await verify.execute(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )

    expect(verified.status).toBe('VERIFIED')
    expect(verified.verifiedAt?.toISOString()).toBe(MONITOR_NOW.toISOString())
  })

  it('refuses a supervisor verifying their own report', async () => {
    const { fixture, submit, verify } = await build()
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )

    await expect(
      verify.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})

describe('RoomReportService roster and slot guards', () => {
  it('refuses an absence for a student seated in another room', async () => {
    const { fixture, save } = await build()

    await expect(
      save.recordAbsence(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: FOREIGN_STUDENT_ID,
          scheduleId: fixture.schedule.id,
          reason: 'SICK',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(fixture.rooms.absences.size).toBe(0)
  })

  it('refuses an absence for a schedule outside the slot window', async () => {
    const { fixture, save } = await build()

    await expect(
      save.recordAbsence(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: fixture.studentIds[0],
          scheduleId: fixture.foreignSchedule.id,
          reason: 'SICK',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(fixture.rooms.absences.size).toBe(0)
  })

  it('refuses an absence against another classroom schedule in the same window', async () => {
    const { fixture, save } = await build()

    await expect(
      save.recordAbsence(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: fixture.studentIds[1],
          scheduleId: fixture.schedule.id,
          reason: 'SICK',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(fixture.rooms.absences.size).toBe(0)
  })

  it('refuses an absence for a student who already started the exam', async () => {
    const { fixture, save } = await build()

    await expect(
      save.recordAbsence(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: fixture.studentIds[0],
          scheduleId: scheduleOf(fixture, fixture.studentIds[0]).id,
          reason: 'ABSENT',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ConflictException)
    expect(fixture.rooms.absences.size).toBe(0)
  })

  it('refuses a draft save that lost the race against a submit', async () => {
    const { fixture, submit } = await build()
    const reports = new RoomReportService(
      fixture.rooms,
      fixture.schedules,
      fixture.sessions,
      new RoomAccessService(fixture.rooms),
      new FakeRoomReportFileStorage(),
    )
    const context = await reports.loadEditable(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )

    await expect(
      reports.saveDraft(context, { incidentNotes: 'setelah submit' }),
    ).rejects.toThrow(ConflictException)
  })

  it('refuses a field note that lost the race against a submit', async () => {
    const { fixture, submit } = await build()
    const reports = new RoomReportService(
      fixture.rooms,
      fixture.schedules,
      fixture.sessions,
      new RoomAccessService(fixture.rooms),
      new FakeRoomReportFileStorage(),
    )
    const context = await reports.loadEditable(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )
    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )

    await expect(
      reports.recordFieldNote(
        context,
        {
          studentId: fixture.studentIds[0],
          category: 'PHYSICAL',
          note: 'Terlambat dicatat',
        },
        SUPERVISOR_USER.id,
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('refuses a field note for a student of another room', async () => {
    const { fixture, save } = await build()

    await expect(
      save.recordFieldNote(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: FOREIGN_STUDENT_ID,
          category: 'PHYSICAL',
          note: 'Membawa catatan',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(fixture.rooms.fieldNotes).toEqual([])
  })

  it('refuses a field note pointing at a session of another room', async () => {
    const { fixture, save } = await build()
    const foreign = startSession(fixture, fixture.studentIds[2], {
      roomId: fixture.otherRoom.id,
    })

    await expect(
      save.recordFieldNote(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.slotId,
        {
          studentId: fixture.studentIds[0],
          sessionId: foreign.id,
          category: 'PHYSICAL',
          note: 'Membawa catatan',
        },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(fixture.rooms.fieldNotes).toEqual([])
  })

  it('reads the report of another shift the caller is scheduled for', async () => {
    const { fixture, get } = await build()

    await expect(
      get.execute(SUPERVISOR_USER, fixture.room.id, fixture.laterSlotId),
    ).resolves.toMatchObject({ slotId: fixture.laterSlotId })
  })

  it('refuses the report of another supervisor slot', async () => {
    const { fixture, get, save } = await build()

    await expect(
      get.execute(SUPERVISOR_USER, fixture.room.id, fixture.foreignSlotId),
    ).rejects.toThrow(ForbiddenException)
    await expect(
      save.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.foreignSlotId,
        { incidentNotes: 'lintas shift' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('reads the report without consulting the clock', async () => {
    const { fixture, get } = await build()

    await expect(
      get.execute(SUPERVISOR_USER, fixture.room.id, fixture.slotId),
    ).resolves.toMatchObject({ slotId: fixture.slotId })
  })

  it('lets the slot supervisor write the report after the window closes', async () => {
    const { fixture, save } = await build()
    const after = new Date('2026-11-02T10:00:00.000Z')

    const saved = await save.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      { condition: 'TECHNICAL_ISSUE', incidentNotes: 'Setelah bel' },
      after,
    )

    expect(saved).toMatchObject({
      status: 'DRAFT',
      incidentNotes: 'Setelah bel',
    })
  })

  it('refuses a write on another supervisor slot', async () => {
    const { fixture, save } = await build()

    await expect(
      save.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        fixture.foreignSlotId,
        { incidentNotes: 'bukan slot saya' },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('lets a coordinator read the report of another shift', async () => {
    const { fixture, get } = await build()

    await expect(
      get.execute(COORDINATOR, fixture.room.id, fixture.laterSlotId),
    ).resolves.toMatchObject({ slotId: fixture.laterSlotId, status: 'DRAFT' })
  })

  it('counts a schedule spanning two slots only in the slot holding its start', async () => {
    const { fixture, save, get } = await build()
    const spanning = await fixture.schedules.createAndLockPackage({
      packageId: (await fixture.packages.findById(fixture.schedule.packageId))!
        .id,
      classroomId: fixture.schedule.classroomId,
      semesterId: fixture.schedule.semesterId,
      eventId: fixture.eventId,
      startsAt: new Date('2026-11-02T02:30:00.000Z'),
      endsAt: new Date('2026-11-02T03:30:00.000Z'),
      durationMinutes: 60,
      type: 'FINAL',
      createdById: 'admin-1',
    })
    if (spanning === null) throw new Error('schedule not created')
    const seated = fixture.studentIds.find(
      (studentId) => scheduleOf(fixture, studentId).id === fixture.schedule.id,
    )!
    const laterSlot = await fixture.rooms.findSupervisorById(
      fixture.laterSlotId,
    )
    const laterStart = laterSlot!.startsAt
    const laterEnd = laterSlot!.endsAt
    const laterSpanning = await fixture.schedules.createAndLockPackage({
      packageId: spanning.packageId,
      classroomId: spanning.classroomId,
      semesterId: spanning.semesterId,
      eventId: fixture.eventId,
      startsAt: new Date(laterStart.getTime() + 30 * 60_000),
      endsAt: new Date(laterEnd.getTime() + 30 * 60_000),
      durationMinutes: 60,
      type: 'FINAL',
      createdById: 'admin-1',
    })
    if (laterSpanning === null) throw new Error('schedule not created')

    await save.recordAbsence(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      {
        studentId: seated,
        scheduleId: spanning.id,
        reason: 'SICK',
      },
      MONITOR_NOW,
    )

    const first = await get.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
    )
    const later = await get.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.laterSlotId,
    )

    expect(first.schedules.map((row) => row.scheduleId)).toContain(spanning.id)
    expect(first.schedules.map((row) => row.scheduleId)).not.toContain(
      laterSpanning.id,
    )
    expect(later.schedules.map((row) => row.scheduleId)).toContain(
      laterSpanning.id,
    )
    expect(later.schedules.map((row) => row.scheduleId)).not.toContain(
      spanning.id,
    )
    expect(first.absences).toHaveLength(1)
  })

  it('writes an audit row for submit, verify, and reopen', async () => {
    const { fixture, submit, verify, save } = await build()

    await submit.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      fixture.slotId,
      PDF_FILE,
      MONITOR_NOW,
    )
    await verify.execute(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      MONITOR_NOW,
    )
    await save.execute(
      COORDINATOR,
      fixture.room.id,
      fixture.slotId,
      { reopen: true },
      MONITOR_NOW,
    )

    const actions = fixture.rooms.auditLogs.map((row) => row.action)
    expect(actions).toEqual(
      expect.arrayContaining([
        'SUBMIT_ROOM_REPORT',
        'VERIFY_ROOM_REPORT',
        'REOPEN_ROOM_REPORT',
      ]),
    )
  })
})
