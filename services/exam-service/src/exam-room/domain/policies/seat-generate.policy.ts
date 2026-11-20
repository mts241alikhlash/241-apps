import { createHash } from 'node:crypto'

import {
  deskOf,
  layoutOf,
  positionOf,
  type SeatLayout,
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
type Zone = Group | null

interface Pair {
  a: number
  b: number
  orthogonal: boolean
}

interface Grid {
  pairs: Pair[]
  neighbours: number[][]
}

const SWAP_ITERATIONS = 30000
const COUNT_ITERATIONS = 300000
const SAME_GRADE_ORTHOGONAL = 10
const SAME_GRADE_DIAGONAL = 3
const SAME_CLASSROOM_ORTHOGONAL = 10
const NEIGHBOURS = [
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
  return generateSeatPlanWithLayouts(students, rooms, rules).plan
}

export function generateSeatPlanWithLayouts(
  students: PlanStudent[],
  rooms: PlanRoom[],
  rules: SeatRules,
): { plan: SeatPlan; layouts: SeatLayout[] } {
  const queues = classroomQueues(students, rules)
  const classIds = [...queues.keys()]
  const layouts: SeatLayout[] = rooms.map((room) =>
    layoutOf(room.capacity, rules.lanesPerSide),
  )
  const groups: Group[] = rules.separateGender ? ['FEMALE', 'MALE'] : ['ALL']

  const plans = groups.map((group) => {
    const lists = classIds.map((id) =>
      queues.get(id)!.filter((student) => matchesGroup(student, group)),
    )
    const sizes = lists.map((list) => list.length)
    const caps = layouts.map((layout) => capacityOf(layout, group))
    const placed = Math.min(sumOf(sizes), sumOf(caps))
    const quota = fillInOrder(placed, caps)
    const rowTarget = apportion(placed, sizes)
    const ideal = rowTarget.map((target) =>
      quota.map((seats) => (placed === 0 ? 0 : (target * seats) / placed)),
    )
    return {
      group,
      lists,
      counts: roundToMarginals(ideal, rowTarget, quota),
    }
  })

  const balanced = balance(
    plans.map((plan) => plan.counts),
    rules.seed,
  )

  rooms.forEach((room, r) => {
    const count = (g: number) => sumOf(balanced[g].map((row) => row[r]))
    const total = sumOf(plans.map((_, g) => count(g)))
    if (total === 0 || total >= room.capacity) return
    if (students.some((student) => student.gender === null)) return
    const compact = layoutOf(total, rules.lanesPerSide)
    const fits = plans.every(
      (plan, g) =>
        plan.group === 'ALL' || count(g) <= capacityOf(compact, plan.group),
    )
    if (fits) layouts[r] = compact
  })

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
    const layout = layouts[r]
    const pool = new Map<Group, PlanStudent[]>(
      plans.map((plan, g) => [plan.group, pools[g][r]]),
    )
    const size = layout.left + layout.right
    const zones = zonesOf(size, layout, pool)
    const grid = gridOf(size, layout)
    const cells = improve(
      greedyFill(zones, pool, grid.neighbours, rules),
      zones,
      grid.pairs,
      rules,
      generatorFor(`${rules.seed}|${room.roomId}`),
    )
    sortWithinClassroomGender(cells)
    const counted = countAdjacency(cells, grid.pairs)
    adjacency.sameGrade += counted.sameGrade
    adjacency.sameClassroom += counted.sameClassroom
    cells.forEach((student, i) => {
      if (student === null) return
      const desk = i + 1
      occupied[r].add(desk)
      roomSeats[r].push(seatOf(room, desk, student, layout))
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
    plan: {
      seats,
      unseated,
      unknownGender,
      adjacentSameGrade: adjacency.sameGrade,
      adjacentSameClassroom: adjacency.sameClassroom,
    },
    layouts,
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

function fillInOrder(total: number, caps: number[]): number[] {
  let left = total
  return caps.map((cap) => {
    const take = Math.min(cap, left)
    left -= take
    return take
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

function gridOf(capacity: number, layout: SeatLayout): Grid {
  const pairs: Pair[] = []
  const neighbours: number[][] = Array.from({ length: capacity }, () => [])
  for (let desk = 1; desk <= capacity; desk++) {
    const position = positionOf(desk, layout)
    for (const [dr, dl, orthogonal] of NEIGHBOURS) {
      const other = deskOf(position.row + dr, position.lane + dl, layout)
      if (other === undefined) continue
      pairs.push({ a: desk - 1, b: other - 1, orthogonal })
      neighbours[desk - 1].push(other - 1)
      neighbours[other - 1].push(desk - 1)
    }
  }
  return { pairs, neighbours }
}

function capacityOf(layout: SeatLayout, group: Group): number {
  if (group === 'FEMALE') return layout.left
  if (group === 'MALE') return layout.right
  return layout.left + layout.right
}

function zonesOf(
  capacity: number,
  layout: SeatLayout,
  pool: Map<Group, PlanStudent[]>,
): Zone[] {
  const zones: Zone[] = Array.from({ length: capacity }, () => null)
  for (const [group, list] of pool) {
    const side = group === 'FEMALE' ? 'LEFT' : group === 'MALE' ? 'RIGHT' : null
    const desks = Array.from({ length: capacity }, (_, i) => i + 1).filter(
      (desk) => side === null || positionOf(desk, layout).side === side,
    )
    if (side !== null) {
      desks.sort((a, b) => {
        const pa = positionOf(a, layout)
        const pb = positionOf(b, layout)
        return pa.row - pb.row || pa.lane - pb.lane
      })
    }
    list.forEach((_, k) => {
      zones[desks[k] - 1] = group
    })
  }
  return zones
}

function greedyFill(
  zones: Zone[],
  pool: Map<Group, PlanStudent[]>,
  neighbours: number[][],
  rules: SeatRules,
): (PlanStudent | null)[] {
  const remaining = new Map<Zone, PlanStudent[]>(
    [...pool].map(([group, list]) => [group, [...list]]),
  )
  const cells: (PlanStudent | null)[] = []
  zones.forEach((zone, i) => {
    if (zone === null) {
      cells.push(null)
      return
    }
    const avoid = neighbours[i]
      .filter((j) => j < i)
      .map((j) => cells[j])
      .filter((s): s is PlanStudent => s !== null)
    const list = remaining.get(zone)!
    cells.push(list.splice(bestCandidate(list, avoid, rules), 1)[0])
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

function improve(
  initial: (PlanStudent | null)[],
  zones: Zone[],
  pairs: Pair[],
  rules: SeatRules,
  next: () => number,
): (PlanStudent | null)[] {
  const cells = [...initial]
  const movable = zones.flatMap((zone, i) => (zone === null ? [] : [i]))
  if (movable.length < 2) return cells
  const cellsOfZone = new Map<Zone, number[]>()
  for (const i of movable) {
    cellsOfZone.set(zones[i], [...(cellsOfZone.get(zones[i]) ?? []), i])
  }
  const costOf = () => {
    let cost = 0
    for (const pair of pairs) {
      const a = cells[pair.a]
      const b = cells[pair.b]
      if (a === null || b === null) continue
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
    const i = movable[Math.floor(next() * movable.length)]
    const sameZone = cellsOfZone.get(zones[i])!
    const j = sameZone[Math.floor(next() * sameZone.length)]
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

function countAdjacency(
  cells: (PlanStudent | null)[],
  pairs: Pair[],
): { sameGrade: number; sameClassroom: number } {
  let sameGrade = 0
  let sameClassroom = 0
  for (const pair of pairs) {
    const a = cells[pair.a]
    const b = cells[pair.b]
    if (!pair.orthogonal || a === null || b === null) continue
    if (a.gradeLevel === b.gradeLevel) sameGrade++
    if (a.classroomId === b.classroomId) sameClassroom++
  }
  return { sameGrade, sameClassroom }
}

function sortWithinClassroomGender(cells: (PlanStudent | null)[]): void {
  const groups = new Map<string, number[]>()
  cells.forEach((student, i) => {
    if (student === null) return
    const key = `${student.classroomId}|${student.gender}`
    const indices = groups.get(key) ?? []
    indices.push(i)
    groups.set(key, indices)
  })
  for (const indices of groups.values()) {
    const sorted = sortedByName(indices.map((i) => cells[i]!))
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
