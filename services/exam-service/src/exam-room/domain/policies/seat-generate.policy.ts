import { createHash } from 'node:crypto'

import {
  layoutOf,
  positionOf,
  type SeatLayout,
  type SeatPosition,
} from './seat-layout.policy.js'

export interface PlanStudent {
  studentId: string
  classroomId: string
  gradeLevel: number
  gender: 'MALE' | 'FEMALE' | null
  name: string
}

export interface PlanRoom {
  roomId: string
  code: string
  capacity: number
}

export interface SeatRules {
  order: 'alphabetical' | 'random'
  separateGender: boolean
  spreadGrades: boolean
  spreadClassrooms: boolean
  lanesPerSide: number
  seed: string
}

export interface PlannedSeat {
  roomId: string
  desk: number
  studentId: string
  classroomId: string
  gradeLevel: number
  gender: 'MALE' | 'FEMALE' | null
  side: 'LEFT' | 'RIGHT'
  row: number
  lane: number
}

export interface SeatPlan {
  seats: PlannedSeat[]
  unseated: PlanStudent[]
  unknownGender: PlanStudent[]
  adjacentSameGrade: number
  adjacentSameClassroom: number
}

export const DEFAULT_SEAT_RULES: Omit<SeatRules, 'seed'> = {
  order: 'alphabetical',
  separateGender: true,
  spreadGrades: true,
  spreadClassrooms: true,
  lanesPerSide: 4,
}

type Group = 'FEMALE' | 'MALE' | 'ALL'

interface Pair {
  a: number
  b: number
  orthogonal: boolean
}

interface BlockResult {
  cells: PlanStudent[]
  sameGrade: number
  sameClassroom: number
}

const SWAP_ITERATIONS = 30000
const COUNT_ITERATIONS = 300000
const SAME_GRADE_ORTHOGONAL = 10
const SAME_GRADE_DIAGONAL = 3
const SAME_CLASSROOM_ORTHOGONAL = 0.4
const NEIGHBOURS_BEFORE = [
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
] as const
const NEIGHBOURS_ALL = [
  [0, 1, true],
  [1, 0, true],
  [1, 1, false],
  [1, -1, false],
] as const

export function generateSeatPlan(
  students: PlanStudent[],
  rooms: PlanRoom[],
  rules: SeatRules,
): SeatPlan {
  const queues = classroomQueues(students, rules)
  const classIds = [...queues.keys()]
  const layouts = rooms.map((room) =>
    layoutOf(room.capacity, rules.lanesPerSide),
  )
  const groups: Group[] = rules.separateGender ? ['FEMALE', 'MALE'] : ['ALL']

  const plans = groups.map((group) => {
    const lists = classIds.map((id) =>
      queues.get(id)!.filter((student) => matchesGroup(student, group)),
    )
    const sizes = lists.map((list) => list.length)
    const quota = quotaFor(rooms, layouts, group, sumOf(sizes))
    const placed = sumOf(quota)
    const rowTarget = apportion(placed, sizes)
    const ideal = rowTarget.map((target) =>
      quota.map((seats) => (placed === 0 ? 0 : (target * seats) / placed)),
    )
    return {
      group,
      lists,
      quota,
      counts: roundToMarginals(ideal, rowTarget, quota),
    }
  })

  const balanced = balance(
    plans.map((plan) => plan.counts),
    rules.seed,
  )

  const pools = plans.map((plan, g) => {
    const offsets = classIds.map(() => 0)
    return rooms.map((_, r) => {
      const pool: PlanStudent[] = []
      classIds.forEach((_id, c) => {
        const count = balanced[g][c][r]
        pool.push(...plan.lists[c].slice(offsets[c], offsets[c] + count))
        offsets[c] += count
      })
      return pool
    })
  })

  const roomSeats: PlannedSeat[][] = rooms.map(() => [])
  const occupied: Set<number>[] = rooms.map(() => new Set())
  const adjacency = { sameGrade: 0, sameClassroom: 0 }

  rooms.forEach((room, r) => {
    plans.forEach((plan, g) => {
      const pool = pools[g][r]
      if (pool.length === 0) return
      const layout = layouts[r]
      const start = plan.group === 'MALE' ? layout.left + 1 : 1
      const block = seatBlock(
        pool,
        start,
        layout,
        rules,
        generatorFor(`${rules.seed}|${room.roomId}|${plan.group}`),
      )
      adjacency.sameGrade += block.sameGrade
      adjacency.sameClassroom += block.sameClassroom
      block.cells.forEach((student, i) => {
        const desk = start + i
        occupied[r].add(desk)
        roomSeats[r].push(seatOf(room, desk, student, layout))
      })
    })
  })

  const seated = new Set<string>()
  roomSeats.forEach((seats) =>
    seats.forEach((seat) => seated.add(seat.studentId)),
  )
  const unknownGender = sortedByName(
    students.filter((student) => student.gender === null),
  )

  if (rules.separateGender) {
    const leftovers = classIds
      .flatMap((id) => queues.get(id)!)
      .filter((student) => student.gender === null)
    let next = 0
    for (let r = rooms.length - 1; r >= 0 && next < leftovers.length; r--) {
      for (
        let desk = rooms[r].capacity;
        desk >= 1 && next < leftovers.length;
        desk--
      ) {
        if (occupied[r].has(desk)) continue
        const student = leftovers[next++]
        roomSeats[r].push(seatOf(rooms[r], desk, student, layouts[r]))
        seated.add(student.studentId)
      }
    }
  }

  const seats = roomSeats.flatMap((list) =>
    list.sort((a, b) => a.desk - b.desk),
  )
  const unseated = sortedByName(
    students.filter((student) => !seated.has(student.studentId)),
  )

  return {
    seats,
    unseated,
    unknownGender,
    adjacentSameGrade: adjacency.sameGrade,
    adjacentSameClassroom: adjacency.sameClassroom,
  }
}

function classroomQueues(
  students: PlanStudent[],
  rules: SeatRules,
): Map<string, PlanStudent[]> {
  const byClassroom = new Map<string, PlanStudent[]>()
  for (const student of [...students].sort((a, b) =>
    compareText(a.studentId, b.studentId),
  )) {
    const list = byClassroom.get(student.classroomId) ?? []
    list.push(student)
    byClassroom.set(student.classroomId, list)
  }
  const queues = new Map<string, PlanStudent[]>()
  for (const id of [...byClassroom.keys()].sort(compareText)) {
    const list = byClassroom.get(id)!
    queues.set(
      id,
      rules.order === 'random'
        ? shuffle(list, rules.seed)
        : [...list].sort(byName),
    )
  }
  return queues
}

function matchesGroup(student: PlanStudent, group: Group): boolean {
  return group === 'ALL' || student.gender === group
}

function quotaFor(
  rooms: PlanRoom[],
  layouts: SeatLayout[],
  group: Group,
  total: number,
): number[] {
  let remaining = total
  return rooms.map((room, r) => {
    const block =
      group === 'FEMALE'
        ? layouts[r].left
        : group === 'MALE'
          ? layouts[r].right
          : room.capacity
    const quota = Math.min(block, remaining)
    remaining -= quota
    return quota
  })
}

function apportion(total: number, sizes: number[]): number[] {
  const sum = sumOf(sizes)
  if (sum === 0) return sizes.map(() => 0)
  const exact = sizes.map((size) => (size * total) / sum)
  const result = exact.map(Math.floor)
  let left = total - sumOf(result)
  const order = exact
    .map((_, i) => i)
    .sort((a, b) => exact[b] - result[b] - (exact[a] - result[a]) || a - b)
  for (const i of order) {
    if (left === 0) break
    result[i] += 1
    left -= 1
  }
  return result
}

function roundToMarginals(
  ideal: number[][],
  rows: number[],
  cols: number[],
): number[][] {
  const base = ideal.map((row) => row.map(Math.floor))
  const rowNeed = rows.map((target, i) => target - sumOf(base[i]))
  const colNeed = cols.map(
    (target, j) => target - sumOf(base.map((row) => row[j])),
  )
  ideal.forEach((row, i) => {
    const order = row
      .map((_, j) => j)
      .sort(
        (a, b) =>
          colNeed[b] - colNeed[a] ||
          row[b] - base[i][b] - (row[a] - base[i][a]) ||
          a - b,
      )
    for (const j of order.slice(0, rowNeed[i])) {
      if (colNeed[j] <= 0) throw new Error('seat counts cannot be rounded')
      base[i][j] += 1
      colNeed[j] -= 1
    }
  })
  return base
}

function balance(matrices: number[][][], seed: string): number[][][] {
  const classes = matrices[0]?.length ?? 0
  const rooms = classes > 0 ? matrices[0][0].length : 0
  if (classes < 2 || rooms < 2) return matrices

  const total = sumOf(
    matrices.map((matrix) => matrix.reduce((s, row) => s + sumOf(row), 0)),
  )
  const placedOf = (c: number) =>
    sumOf(matrices.map((matrix) => sumOf(matrix[c])))
  const occupiedOf = (r: number) =>
    sumOf(matrices.map((matrix) => sumOf(matrix.map((row) => row[r]))))
  const ideal = Array.from({ length: classes }, (_, c) =>
    Array.from({ length: rooms }, (_, r) =>
      total === 0 ? 0 : (placedOf(c) * occupiedOf(r)) / total,
    ),
  )
  const costOf = () => {
    let cost = 0
    for (let c = 0; c < classes; c++) {
      for (let r = 0; r < rooms; r++) {
        const combined = sumOf(matrices.map((matrix) => matrix[c][r]))
        cost += (combined - ideal[c][r]) ** 2
      }
    }
    return cost
  }

  const next = generatorFor(`${seed}|counts`)
  let current = costOf()
  let best = current
  let bestMatrices = copyMatrices(matrices)
  for (let it = 0; it < COUNT_ITERATIONS; it++) {
    const matrix = matrices[Math.floor(next() * matrices.length)]
    const [a, b] = distinctPair(classes, next)
    const [r1, r2] = distinctPair(rooms, next)
    if (matrix[a][r1] < 1 || matrix[b][r2] < 1) continue
    matrix[a][r1] -= 1
    matrix[a][r2] += 1
    matrix[b][r2] -= 1
    matrix[b][r1] += 1
    const candidate = costOf()
    const temperature = Math.max(0.001, 0.5 * (1 - it / COUNT_ITERATIONS))
    if (
      candidate <= current ||
      next() < Math.exp((current - candidate) / temperature)
    ) {
      current = candidate
      if (current < best - 1e-9) {
        best = current
        bestMatrices = copyMatrices(matrices)
      }
    } else {
      matrix[a][r1] += 1
      matrix[a][r2] -= 1
      matrix[b][r2] += 1
      matrix[b][r1] -= 1
    }
  }
  return bestMatrices
}

function seatBlock(
  pool: PlanStudent[],
  start: number,
  layout: SeatLayout,
  rules: SeatRules,
  next: () => number,
): BlockResult {
  const positions = pool.map((_, i) => positionOf(start + i, layout))
  const indexOf = new Map(positions.map((p, i) => [keyOf(p), i]))
  const pairs = adjacentPairs(positions, indexOf)
  const greedy = greedyFill(pool, positions, indexOf, rules)
  const cells = improve(greedy, pairs, rules, next)
  sortWithinClassroomGender(cells)
  let sameGrade = 0
  let sameClassroom = 0
  for (const pair of pairs) {
    if (!pair.orthogonal) continue
    if (cells[pair.a].gradeLevel === cells[pair.b].gradeLevel) sameGrade++
    if (cells[pair.a].classroomId === cells[pair.b].classroomId) sameClassroom++
  }
  return { cells, sameGrade, sameClassroom }
}

function greedyFill(
  pool: PlanStudent[],
  positions: SeatPosition[],
  indexOf: Map<string, number>,
  rules: SeatRules,
): PlanStudent[] {
  const remaining = [...pool]
  const cells: PlanStudent[] = []
  positions.forEach((p, i) => {
    const avoid = NEIGHBOURS_BEFORE.map(([dr, dl]) =>
      indexOf.get(keyOf({ side: p.side, row: p.row + dr, lane: p.lane + dl })),
    )
      .filter((j): j is number => j !== undefined && j < i)
      .map((j) => cells[j])
    cells.push(remaining.splice(bestCandidate(remaining, avoid, rules), 1)[0])
  })
  return cells
}

function bestCandidate(
  pool: PlanStudent[],
  avoid: PlanStudent[],
  rules: SeatRules,
): number {
  const sizes = new Map<string, number>()
  for (const student of pool) {
    sizes.set(student.classroomId, (sizes.get(student.classroomId) ?? 0) + 1)
  }
  let best = 0
  let bestScore: number[] = []
  pool.forEach((student, k) => {
    const score = [
      rules.spreadGrades &&
      avoid.some((a) => a.gradeLevel === student.gradeLevel)
        ? 0
        : 1,
      rules.spreadClassrooms &&
      avoid.some((a) => a.classroomId === student.classroomId)
        ? 0
        : 1,
      sizes.get(student.classroomId) ?? 0,
    ]
    if (k === 0 || scoreIsBetter(score, bestScore)) {
      best = k
      bestScore = score
    }
  })
  return best
}

function scoreIsBetter(score: number[], other: number[]): boolean {
  for (let i = 0; i < score.length; i++) {
    if (score[i] !== other[i]) return score[i] > other[i]
  }
  return false
}

function adjacentPairs(
  positions: SeatPosition[],
  indexOf: Map<string, number>,
): Pair[] {
  const pairs: Pair[] = []
  positions.forEach((p, a) => {
    for (const [dr, dl, orthogonal] of NEIGHBOURS_ALL) {
      const b = indexOf.get(
        keyOf({ side: p.side, row: p.row + dr, lane: p.lane + dl }),
      )
      if (b !== undefined) pairs.push({ a, b, orthogonal })
    }
  })
  return pairs
}

function improve(
  initial: PlanStudent[],
  pairs: Pair[],
  rules: SeatRules,
  next: () => number,
): PlanStudent[] {
  const cells = [...initial]
  const n = cells.length
  if (n < 2) return cells
  const costOf = () => {
    let cost = 0
    for (const pair of pairs) {
      const a = cells[pair.a]
      const b = cells[pair.b]
      if (rules.spreadGrades && a.gradeLevel === b.gradeLevel) {
        cost += pair.orthogonal ? SAME_GRADE_ORTHOGONAL : SAME_GRADE_DIAGONAL
      }
      if (
        rules.spreadClassrooms &&
        pair.orthogonal &&
        a.classroomId === b.classroomId
      ) {
        cost += SAME_CLASSROOM_ORTHOGONAL
      }
    }
    return cost
  }
  let current = costOf()
  let best = current
  let bestCells = [...cells]
  for (let it = 0; it < SWAP_ITERATIONS && best > 0; it++) {
    const i = Math.floor(next() * n)
    const j = Math.floor(next() * n)
    if (i === j) continue
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
    const candidate = costOf()
    const temperature = Math.max(0.05, 6 * (1 - it / SWAP_ITERATIONS))
    if (
      candidate <= current ||
      next() < Math.exp((current - candidate) / temperature)
    ) {
      current = candidate
      if (candidate < best) {
        best = candidate
        bestCells = [...cells]
      }
    } else {
      ;[cells[i], cells[j]] = [cells[j], cells[i]]
    }
  }
  return bestCells
}

function sortWithinClassroomGender(cells: PlanStudent[]): void {
  const groups = new Map<string, number[]>()
  cells.forEach((student, i) => {
    const key = `${student.classroomId}|${student.gender}`
    const indices = groups.get(key) ?? []
    indices.push(i)
    groups.set(key, indices)
  })
  for (const indices of groups.values()) {
    const sorted = sortedByName(indices.map((i) => cells[i]))
    indices.forEach((i, k) => {
      cells[i] = sorted[k]
    })
  }
}

function seatOf(
  room: PlanRoom,
  desk: number,
  student: PlanStudent,
  layout: SeatLayout,
): PlannedSeat {
  const position = positionOf(desk, layout)
  return {
    roomId: room.roomId,
    desk,
    studentId: student.studentId,
    classroomId: student.classroomId,
    gradeLevel: student.gradeLevel,
    gender: student.gender,
    side: position.side,
    row: position.row,
    lane: position.lane,
  }
}

function keyOf(p: SeatPosition): string {
  return `${p.side}:${p.row}:${p.lane}`
}

function byName(a: PlanStudent, b: PlanStudent): number {
  return (
    a.name.localeCompare(b.name, 'id') || compareText(a.studentId, b.studentId)
  )
}

function sortedByName(students: PlanStudent[]): PlanStudent[] {
  return [...students].sort(byName)
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function sumOf(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function distinctPair(n: number, next: () => number): [number, number] {
  const a = Math.floor(next() * n)
  let b = Math.floor(next() * (n - 1))
  if (b >= a) b += 1
  return [a, b]
}

function copyMatrices(matrices: number[][][]): number[][][] {
  return matrices.map((matrix) => matrix.map((row) => [...row]))
}

function shuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]
  const next = generatorFor(seed)
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

function generatorFor(seed: string): () => number {
  let state = createHash('sha256').update(seed).digest().readUInt32LE(0)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
