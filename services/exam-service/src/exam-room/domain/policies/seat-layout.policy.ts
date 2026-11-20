export interface SeatLayout {
  lanes: number
  rows: number
  left: number
  right: number
}

export interface SeatPosition {
  side: 'LEFT' | 'RIGHT'
  row: number
  lane: number
}

function rowWidth(lanes: number): number {
  return 2 * lanes
}

function rowOf(desk: number, lanes: number): number {
  return Math.floor((desk - 1) / rowWidth(lanes)) + 1
}

function laneOf(desk: number, lanes: number, capacity: number): number {
  const row = rowOf(desk, lanes)
  const base = (row - 1) * rowWidth(lanes)
  if (row % 2 === 1) return desk - base
  return Math.min(row * rowWidth(lanes), capacity) - desk + 1
}

export function layoutOf(capacity: number, lanes: number): SeatLayout {
  const rows = Math.ceil(capacity / rowWidth(lanes))
  let left = 0
  for (let desk = 1; desk <= capacity; desk++) {
    if (laneOf(desk, lanes, capacity) <= lanes) left++
  }
  return { lanes, rows, left, right: capacity - left }
}

export function positionOf(desk: number, layout: SeatLayout): SeatPosition {
  const capacity = layout.left + layout.right
  if (!Number.isInteger(desk) || desk < 1 || desk > capacity) {
    throw new RangeError(`desk ${desk} is outside 1..${capacity}`)
  }
  const lane = laneOf(desk, layout.lanes, capacity)
  return {
    side: lane <= layout.lanes ? 'LEFT' : 'RIGHT',
    row: rowOf(desk, layout.lanes),
    lane,
  }
}

export function deskOf(
  row: number,
  lane: number,
  layout: SeatLayout,
): number | undefined {
  const width = rowWidth(layout.lanes)
  const capacity = layout.left + layout.right
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(lane) ||
    row < 1 ||
    row > layout.rows ||
    lane < 1 ||
    lane > width
  ) {
    return undefined
  }
  const base = (row - 1) * width
  const desk =
    row % 2 === 1 ? base + lane : Math.min(row * width, capacity) - lane + 1
  return desk > base && desk <= Math.min(base + width, capacity)
    ? desk
    : undefined
}
