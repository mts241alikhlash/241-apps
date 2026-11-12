import { AccessCodeDto, ExamScheduleDto } from './exam-schedule-response.dto.js'
import { ExamActivityDto } from '../../../../../exam-activity/presentation/http/dto/exam-activity.dto.js'
import { ExamEventDto } from '../../../../../exam-room/presentation/http/dto/exam-room.dto.js'
import { MyExamDto } from '../../../../../exam-session/presentation/http/dto/student-exam-response.dto.js'
import { DEFAULT_POLICIES } from '../../../../../exam-activity/domain/policies/exam-policy.policy.js'

const view = {
  id: '55555555-5555-4555-8555-555555555555',
  packageId: '66666666-6666-4666-8666-666666666666',
  subjectId: '11111111-1111-4111-8111-111111111111',
  packageTitle: 'UTS',
  classroomId: '77777777-7777-4777-8777-777777777777',
  classroomName: 'VII A',
  semesterId: '88888888-8888-4888-8888-888888888888',
  eventId: null,
  startsAt: new Date('2026-11-02T01:00:00.000Z'),
  endsAt: new Date('2026-11-02T04:00:00.000Z'),
  durationMinutes: 90,
  type: 'DAILY' as const,
  kind: 'MAKEUP' as const,
  makeupOfId: '44444444-4444-4444-8444-444444444444',
  tokenRotation: 3,
  minSubmitMinutes: 0,
  status: 'SCHEDULED' as const,
  createdById: '99999999-9999-4999-8999-999999999999',
  createdAt: new Date('2026-10-30T00:00:00.000Z'),
  updatedAt: new Date('2026-10-30T00:00:00.000Z'),
}

describe('exam schedule response DTOs', () => {
  it('never carries an access code or the rotation counter', () => {
    const json = JSON.stringify(ExamScheduleDto.fromDomain(view))

    expect(json).not.toMatch(/access|token|code/iu)
    expect(json).not.toContain('"tokenRotation"')
  })

  it('serialises dates as ISO strings', () => {
    const dto = ExamScheduleDto.fromDomain(view)

    expect(dto.startsAt).toBe('2026-11-02T01:00:00.000Z')
    expect(dto.endsAt).toBe('2026-11-02T04:00:00.000Z')
  })

  it('says whether a schedule is a makeup and of which one', () => {
    const dto = ExamScheduleDto.fromDomain(view)

    expect(dto.kind).toBe('MAKEUP')
    expect(dto.makeupOfId).toBe('44444444-4444-4444-8444-444444444444')
  })

  it('exposes the access code only through AccessCodeDto', () => {
    const dto = AccessCodeDto.of(
      'K7M2QX',
      3,
      new Date('2026-11-02T10:10:00.000Z'),
      29_333_334,
    )

    expect(dto).toEqual({
      accessCode: 'K7M2QX',
      rotation: 3,
      expiresAt: '2026-11-02T10:10:00.000Z',
      slotIndex: 29_333_334,
    })
  })

  it('derives category from type on ExamScheduleDto, ExamActivityDto, ExamEventDto, and MyExamDto', () => {
    expect(ExamScheduleDto.fromDomain(view).category).toBe('NON_EXAM')
    expect(
      ExamScheduleDto.fromDomain({ ...view, type: 'MIDTERM' }).category,
    ).toBe('EXAM')

    expect(
      ExamActivityDto.of({
        id: 'act-1',
        semesterId: 'sem-1',
        eventId: null,
        gradeId: 'grade-1',
        subjectId: 'sub-1',
        packageId: 'pkg-1',
        type: 'FINAL',
        tokenMode: 'ROTATING',
        tokenRotation: 0,
        presetId: 'preset-1',
        policy: { ...DEFAULT_POLICIES.FINAL },
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        durationMinutes: 90,
        status: 'SCHEDULED',
        createdById: 'admin-1',
      }).category,
    ).toBe('EXAM')

    expect(
      ExamEventDto.fromDomain({
        id: 'evt-1',
        semesterId: 'sem-1',
        name: 'UTS',
        type: 'MIDTERM',
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T04:00:00.000Z'),
        lateToleranceMinutes: 30,
        minSubmitMinutes: 20,
        requireAndroidApp: true,
        status: 'ACTIVE',
      }).category,
    ).toBe('EXAM')

    expect(
      MyExamDto.fromDomain({
        id: view.id,
        title: view.packageTitle,
        subjectId: view.subjectId,
        subjectName: null,
        type: 'ASSIGNMENT',
        startsAt: view.startsAt,
        endsAt: view.endsAt,
        durationMinutes: view.durationMinutes,
        minSubmitMinutes: view.minSubmitMinutes,
        status: 'OPEN',
        sessionId: null,
        activityId: null,
        activityStatus: null,
        eventId: null,
        eventName: null,
        lifecycle: 'OPEN',
        roomName: null,
        seatNumber: null,
        participantNumber: null,
        makeup: false,
      }).category,
    ).toBe('NON_EXAM')
  })
})
