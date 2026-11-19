import {
  DEFAULT_SEAT_RULES,
  generateSeatPlan,
  type PlanRoom,
  type PlanStudent,
  type SeatRules,
} from './seat-generate.policy.js'
import { layoutOf } from './seat-layout.policy.js'

const rules = (overrides: Partial<SeatRules> = {}): SeatRules => ({
  ...DEFAULT_SEAT_RULES,
  seed: 'test',
  ...overrides,
})

function student(
  classroomId: string,
  gradeLevel: number,
  gender: 'MALE' | 'FEMALE' | null,
  index: number,
): PlanStudent {
  return {
    studentId: `${classroomId}-${gender ?? 'X'}-${index}`,
    classroomId,
    gradeLevel,
    gender,
    name: `${classroomId} ${gender ?? 'X'} ${String(index).padStart(3, '0')}`,
  }
}

const SCHOOL_CLASSROOMS = [
  { id: '7A', grade: 7, total: 35, female: 17 },
  { id: '7B', grade: 7, total: 35, female: 17 },
  { id: '8A', grade: 8, total: 32, female: 16 },
  { id: '8B', grade: 8, total: 31, female: 16 },
  { id: '9A', grade: 9, total: 27, female: 15 },
  { id: '9B', grade: 9, total: 28, female: 15 },
]

function schoolStudents(): PlanStudent[] {
  const students: PlanStudent[] = []
  for (const classroom of SCHOOL_CLASSROOMS) {
    for (let i = 0; i < classroom.total; i++) {
      const gender = i < classroom.female ? 'FEMALE' : 'MALE'
      students.push(student(classroom.id, classroom.grade, gender, i))
    }
  }
  return students.reverse()
}

const SCHOOL_ROOMS: PlanRoom[] = [32, 32, 32, 32, 32, 28].map(
  (capacity, i) => ({
    roomId: `room-${i + 1}`,
    code: `R${i + 1}`,
    capacity,
  }),
)

describe('generateSeatPlan', () => {
  it('fills every room to capacity without gaps or repeats', () => {
    const rooms: PlanRoom[] = [
      { roomId: 'a', code: 'A', capacity: 32 },
      { roomId: 'b', code: 'B', capacity: 28 },
    ]
    const students = [
      ...Array.from({ length: 30 }, (_, i) =>
        student('7A', 7, i % 2 ? 'MALE' : 'FEMALE', i),
      ),
      ...Array.from({ length: 30 }, (_, i) =>
        student('8A', 8, i % 2 ? 'MALE' : 'FEMALE', 100 + i),
      ),
    ]
    const plan = generateSeatPlan(
      students,
      rooms,
      rules({ separateGender: false }),
    )
    for (const room of rooms) {
      const desks = plan.seats
        .filter((seat) => seat.roomId === room.roomId)
        .map((seat) => seat.desk)
        .sort((a, b) => a - b)
      expect(desks).toEqual(
        Array.from({ length: room.capacity }, (_, i) => i + 1),
      )
    }
    expect(plan.unseated).toHaveLength(0)
  })

  it('seats the school data by gender blocks with balanced rooms and no adjacent grade or classroom', () => {
    const started = performance.now()
    const plan = generateSeatPlan(schoolStudents(), SCHOOL_ROOMS, rules())
    const elapsed = performance.now() - started
    process.stdout.write(
      `school test: adjacentSameGrade=${plan.adjacentSameGrade} adjacentSameClassroom=${plan.adjacentSameClassroom} time=${elapsed.toFixed(0)}ms\n`,
    )

    expect(plan.unseated).toHaveLength(0)
    expect(plan.unknownGender).toHaveLength(0)

    for (const seat of plan.seats) {
      expect(seat.side).toBe(seat.gender === 'FEMALE' ? 'LEFT' : 'RIGHT')
    }

    const seatsPerRoom = SCHOOL_ROOMS.map(
      (room) => plan.seats.filter((seat) => seat.roomId === room.roomId).length,
    )
    expect(seatsPerRoom).toEqual([32, 32, 32, 32, 32, 28])

    const femalePerRoom = SCHOOL_ROOMS.map(
      (room) =>
        plan.seats.filter(
          (seat) => seat.roomId === room.roomId && seat.gender === 'FEMALE',
        ).length,
    )
    const malePerRoom = SCHOOL_ROOMS.map(
      (room) =>
        plan.seats.filter(
          (seat) => seat.roomId === room.roomId && seat.gender === 'MALE',
        ).length,
    )
    expect(femalePerRoom).toEqual([16, 16, 16, 16, 16, 16])
    expect(malePerRoom).toEqual([16, 16, 16, 16, 16, 12])

    for (const classroom of SCHOOL_CLASSROOMS) {
      const total = schoolStudents().filter(
        (s) => s.classroomId === classroom.id,
      ).length
      SCHOOL_ROOMS.forEach((room) => {
        const count = plan.seats.filter(
          (seat) =>
            seat.roomId === room.roomId && seat.classroomId === classroom.id,
        ).length
        const ideal = (total * room.capacity) / 188
        expect(Math.abs(count - ideal)).toBeLessThanOrEqual(1)
      })
    }

    expect(plan.adjacentSameGrade).toBe(0)
    expect(plan.adjacentSameClassroom).toBe(0)

    for (const classroom of SCHOOL_CLASSROOMS) {
      for (const gender of ['FEMALE', 'MALE'] as const) {
        const names = SCHOOL_ROOMS.flatMap((room) =>
          plan.seats
            .filter(
              (seat) =>
                seat.roomId === room.roomId &&
                seat.classroomId === classroom.id &&
                seat.gender === gender,
            )
            .sort((a, b) => a.desk - b.desk)
            .map((seat) => seat.studentId),
        )
        const byId = new Map(schoolStudents().map((s) => [s.studentId, s.name]))
        const ordered = names.map((id) => byId.get(id)!)
        expect(ordered).toEqual(
          [...ordered].sort((a, b) => a.localeCompare(b, 'id')),
        )
      }
    }
  })

  it('is deterministic for the same input and rules', () => {
    const first = generateSeatPlan(schoolStudents(), SCHOOL_ROOMS, rules())
    const second = generateSeatPlan(schoolStudents(), SCHOOL_ROOMS, rules())
    expect(second).toEqual(first)
  })

  it('changes a random plan with the seed and keeps it per seed', () => {
    const random = { order: 'random' as const }
    const a = generateSeatPlan(
      schoolStudents(),
      SCHOOL_ROOMS,
      rules({ ...random, seed: 'one' }),
    )
    const b = generateSeatPlan(
      schoolStudents(),
      SCHOOL_ROOMS,
      rules({ ...random, seed: 'two' }),
    )
    const again = generateSeatPlan(
      schoolStudents(),
      SCHOOL_ROOMS,
      rules({ ...random, seed: 'one' }),
    )
    expect(a.seats).not.toEqual(b.seats)
    expect(again).toEqual(a)
  })

  it('reports null gender students and seats them after the right block', () => {
    const students = [
      student('7A', 7, 'FEMALE', 1),
      student('7A', 7, 'MALE', 2),
      student('8A', 8, null, 3),
    ]
    const rooms: PlanRoom[] = [{ roomId: 'a', code: 'A', capacity: 8 }]
    const plan = generateSeatPlan(students, rooms, rules())
    expect(plan.unknownGender.map((s) => s.studentId)).toEqual(['8A-X-3'])
    expect(plan.seats.filter((seat) => seat.gender === null)).toHaveLength(1)
    const unknown = plan.seats.find((seat) => seat.studentId === '8A-X-3')!
    expect(unknown.side).toBe('RIGHT')
    expect(unknown.desk).toBeGreaterThan(layoutOf(8, 4).left)
    expect(plan.unseated).toHaveLength(0)
  })

  it('puts students beyond total capacity in unseated', () => {
    const students = Array.from({ length: 10 }, (_, i) =>
      student('7A', 7, 'MALE', i),
    )
    const rooms: PlanRoom[] = [{ roomId: 'a', code: 'A', capacity: 6 }]
    const plan = generateSeatPlan(
      students,
      rooms,
      rules({ separateGender: false }),
    )
    expect(plan.seats).toHaveLength(6)
    expect(plan.unseated).toHaveLength(4)
  })
})
