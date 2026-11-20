import {
  DEFAULT_SEAT_RULES,
  generateSeatPlan,
  type PlanRoom,
  type PlanStudent,
  type PlannedSeat,
  type SeatRules,
} from './seat-generate.policy.js'
import { deskOf, layoutOf } from './seat-layout.policy.js'

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

function orthogonalPairs(
  seats: PlannedSeat[],
  roomId: string,
): [PlannedSeat, PlannedSeat][] {
  const byCell = new Map(
    seats
      .filter((seat) => seat.roomId === roomId)
      .map((seat) => [`${seat.row}:${seat.lane}`, seat] as const),
  )
  const pairs: [PlannedSeat, PlannedSeat][] = []
  for (const seat of seats.filter((s) => s.roomId === roomId)) {
    for (const [dr, dl] of [
      [0, 1],
      [1, 0],
    ]) {
      const other = byCell.get(`${seat.row + dr}:${seat.lane + dl}`)
      if (other) pairs.push([seat, other])
    }
  }
  return pairs
}

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

  it('seats the school data by gender zones with proportional rooms and no adjacent grade or classroom', () => {
    const started = performance.now()
    const plan = generateSeatPlan(schoolStudents(), SCHOOL_ROOMS, rules())
    const elapsed = performance.now() - started
    process.stdout.write(
      `school test: adjacentSameGrade=${plan.adjacentSameGrade} adjacentSameClassroom=${plan.adjacentSameClassroom} time=${elapsed.toFixed(0)}ms\n`,
    )

    expect(plan.unseated).toHaveLength(0)
    expect(plan.unknownGender).toHaveLength(0)

    for (const seat of plan.seats) {
      expect(seat.side).toBe(seat.lane <= 4 ? 'LEFT' : 'RIGHT')
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

  it('numbers a 32-seat room in one snake and keeps no same class or grade neighbours across the aisle', () => {
    const students = [
      ...Array.from({ length: 6 }, (_, i) => student('7A', 7, 'FEMALE', i)),
      ...Array.from({ length: 5 }, (_, i) =>
        student('8A', 8, 'FEMALE', 10 + i),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        student('9A', 9, 'FEMALE', 20 + i),
      ),
      ...Array.from({ length: 6 }, (_, i) => student('7A', 7, 'MALE', 30 + i)),
      ...Array.from({ length: 5 }, (_, i) => student('8A', 8, 'MALE', 40 + i)),
      ...Array.from({ length: 5 }, (_, i) => student('9A', 9, 'MALE', 50 + i)),
    ]
    const rooms: PlanRoom[] = [{ roomId: 'a', code: 'A', capacity: 32 }]
    const plan = generateSeatPlan(students, rooms, rules())

    expect(plan.unseated).toHaveLength(0)
    const at = (desk: number) => plan.seats.find((s) => s.desk === desk)!
    expect([at(1), at(8)].map((s) => [s.row, s.lane])).toEqual([
      [1, 1],
      [1, 8],
    ])
    expect([at(9), at(16)].map((s) => [s.row, s.lane])).toEqual([
      [2, 8],
      [2, 1],
    ])
    expect([at(17), at(24)].map((s) => [s.row, s.lane])).toEqual([
      [3, 1],
      [3, 8],
    ])
    expect([at(25), at(32)].map((s) => [s.row, s.lane])).toEqual([
      [4, 8],
      [4, 1],
    ])

    const pairs = orthogonalPairs(plan.seats, 'a')
    expect(pairs).toHaveLength(2 * 4 * 8 - 4 - 8)
    expect(
      pairs.filter(([a, b]) => a.classroomId === b.classroomId),
    ).toHaveLength(0)
    expect(
      pairs.filter(([a, b]) => a.gradeLevel === b.gradeLevel),
    ).toHaveLength(0)
    expect(plan.adjacentSameClassroom).toBe(0)
    expect(plan.adjacentSameGrade).toBe(0)
  })

  it('keeps girls on lanes 1..4 and boys on lanes 5..8 of a 32-seat room', () => {
    const students = [
      ...Array.from({ length: 16 }, (_, i) =>
        student(i % 2 ? '7A' : '8A', i % 2 ? 7 : 8, 'FEMALE', i),
      ),
      ...Array.from({ length: 16 }, (_, i) =>
        student(i % 2 ? '7A' : '8A', i % 2 ? 7 : 8, 'MALE', 100 + i),
      ),
    ]
    const rooms: PlanRoom[] = [{ roomId: 'a', code: 'A', capacity: 32 }]
    const plan = generateSeatPlan(students, rooms, rules())
    expect(
      plan.seats.filter((s) => s.gender === 'FEMALE' && s.lane > 4),
    ).toHaveLength(0)
    expect(
      plan.seats.filter((s) => s.gender === 'MALE' && s.lane < 5),
    ).toHaveLength(0)
  })

  it('gives a 28-seat room with 16 girls and 12 boys unique desks and girls on lanes 1..4 only', () => {
    const students = [
      ...Array.from({ length: 8 }, (_, i) => student('7A', 7, 'FEMALE', i)),
      ...Array.from({ length: 8 }, (_, i) =>
        student('8A', 8, 'FEMALE', 10 + i),
      ),
      ...Array.from({ length: 6 }, (_, i) => student('7A', 7, 'MALE', 30 + i)),
      ...Array.from({ length: 6 }, (_, i) => student('8A', 8, 'MALE', 40 + i)),
    ]
    const rooms: PlanRoom[] = [{ roomId: 'b', code: 'B', capacity: 28 }]
    const plan = generateSeatPlan(students, rooms, rules())

    expect(plan.unseated).toHaveLength(0)
    const desks = plan.seats.map((s) => s.desk).sort((a, b) => a - b)
    expect(desks).toEqual(Array.from({ length: 28 }, (_, i) => i + 1))

    const layout = layoutOf(28, 4)
    const girls = plan.seats.filter((s) => s.gender === 'FEMALE')
    expect(girls).toHaveLength(16)
    expect(girls.filter((s) => s.lane <= 4)).toHaveLength(16)
    expect(
      plan.seats.filter((s) => s.gender === 'MALE' && s.lane > 4),
    ).toHaveLength(12)
    for (const seat of plan.seats) {
      expect(deskOf(seat.row, seat.lane, layout)).toBe(seat.desk)
    }
    expect(plan.seats.find((s) => s.desk === 28)).toMatchObject({
      row: 4,
      lane: 1,
      side: 'LEFT',
    })
    expect(plan.seats.filter((s) => s.row === 4 && s.lane > 4)).toHaveLength(0)
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

  it('reports null gender students and seats them in a free desk', () => {
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
    expect(unknown.desk).toBe(8)
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
