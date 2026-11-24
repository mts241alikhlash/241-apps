import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GradingSchedule } from '@/features/exam-grading/types'
import { gradingSheetService } from './gradingSheetService'

const {
  getScheduleSessionDetails,
  getSessions,
  loadSession,
  lookupNumbers,
  getTeachingAssignments,
} = vi.hoisted(() => ({
  getScheduleSessionDetails: vi.fn(),
  getSessions: vi.fn(),
  loadSession: vi.fn(),
  lookupNumbers: vi.fn(),
  getTeachingAssignments: vi.fn(),
}))

vi.mock('@/features/exam-grading/api/examGradingApi', () => ({
  examGradingApi: {
    getSchedules: vi.fn(),
    getSessions,
    getScheduleSessionDetails,
  },
}))

vi.mock('@/features/exam-grading/services/examGradingService', () => ({
  examGradingService: {
    loadSession,
  },
}))

vi.mock('@/features/exam-participant/api/participantNumberApi', () => ({
  participantNumberApi: {
    lookup: lookupNumbers,
  },
}))

vi.mock('@/features/lookup/teaching-assignment', () => ({
  teachingAssignmentApi: {
    getTeachingAssignments,
    getMyTeachingAssignments: vi.fn(),
  },
}))

const baseSchedule: GradingSchedule = {
  id: 'sch-1',
  title: 'Matematika',
  subjectId: 'sub-1',
  classroomId: 'cls-1',
  classroomName: 'VII-A',
  semesterId: 'sem-1',
  type: 'FINAL',
  category: 'EXAM',
  packageId: 'pkg-1',
  durationMinutes: 90,
  kind: 'REGULAR',
  startsAt: '2026-11-24T00:00:00.000Z',
  endsAt: '2026-11-24T01:30:00.000Z',
  sessions: 2,
  awaitingGrading: 1,
  graded: 1,
}

beforeEach(() => {
  vi.clearAllMocks()
  lookupNumbers.mockResolvedValue([{ studentId: 'st-1', number: '001' }])
  getTeachingAssignments.mockResolvedValue({
    data: [
      {
        classroomId: 'cls-1',
        subjectId: 'sub-1',
        employee: { user: { profile: { name: 'Ust. Ahmad' } } },
      },
    ],
  })
})

describe('gradingSheetService.loadSheet', () => {
  it('returns empty sheet immediately when schedule has zero sessions', async () => {
    const result = await gradingSheetService.loadSheet(
      { ...baseSchedule, sessions: 0, awaitingGrading: 0, graded: 0 },
      'Matematika',
    )

    expect(result).toEqual({
      schedule: { ...baseSchedule, sessions: 0, awaitingGrading: 0, graded: 0 },
      subject: 'Matematika',
      teacher: '',
      students: [],
    })
    expect(getScheduleSessionDetails).not.toHaveBeenCalled()
    expect(getSessions).not.toHaveBeenCalled()
    expect(getTeachingAssignments).not.toHaveBeenCalled()
  })

  it('uses batch schedule details once and skips teacher lookup when includeTeacher is false', async () => {
    getScheduleSessionDetails.mockResolvedValue([
      {
        session: {
          sessionId: 'ses-1',
          scheduleId: 'sch-1',
          studentId: 'st-1',
          studentName: 'Budi',
          studentNis: '2024001',
          status: 'GRADED',
          rawScore: 80,
          maxScore: 100,
        },
        items: [
          {
            questionId: 'q-mc',
            number: 1,
            type: 'MULTIPLE_CHOICE',
            manual: false,
            bodyHtml: '<p>PG</p>',
            points: 10,
            guideHtml: null,
            acceptedAnswers: null,
            choices: [],
            correctKeys: ['A'],
            correctValue: null,
            answer: { key: 'A' },
            score: 10,
            note: null,
            gradedAt: null,
            needsGrading: false,
          },
          {
            questionId: 'q-essay',
            number: 2,
            type: 'ESSAY',
            manual: true,
            bodyHtml: '<p>Uraian</p>',
            points: 20,
            guideHtml: '<p>Kunci</p>',
            acceptedAnswers: null,
            choices: null,
            correctKeys: null,
            correctValue: null,
            answer: { text: 'Jawab' },
            score: 15,
            note: null,
            gradedAt: null,
            needsGrading: false,
          },
        ],
      },
    ])

    const manualSheet = await gradingSheetService.loadSheet(
      baseSchedule,
      'Matematika',
    )
    const recapSheet = await gradingSheetService.loadSheet(
      baseSchedule,
      'Matematika',
      undefined,
      { manualOnly: false, includeTeacher: false },
    )

    expect(getScheduleSessionDetails).toHaveBeenCalledTimes(2)
    expect(loadSession).not.toHaveBeenCalled()
    expect(manualSheet.teacher).toBe('Ust. Ahmad')
    expect(manualSheet.students[0].items.map((i) => i.questionId)).toEqual([
      'q-essay',
    ])
    expect(manualSheet.students[0].participantNumber).toBe('001')
    expect(recapSheet.teacher).toBe('')
    expect(recapSheet.students[0].items.map((i) => i.questionId)).toEqual([
      'q-mc',
      'q-essay',
    ])
  })
})
