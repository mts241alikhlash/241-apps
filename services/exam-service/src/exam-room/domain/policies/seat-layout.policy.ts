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

export function layoutOf(capacity: number, lanes: number): SeatLayout {
  const rows = Math.ceil(capacity / (2 * lanes))
  const left = Math.min(lanes * rows, capacity)
  return { lanes, rows, left, right: capacity - left }
}

export function positionOf(desk: number, layout: SeatLayout): SeatPosition {
  const capacity = layout.left + layout.right
  if (!Number.isInteger(desk) || desk < 1 || desk > capacity) {
    throw new RangeError(`desk ${desk} is outside 1..${capacity}`)
  }
  const side = desk <= layout.left ? 'LEFT' : 'RIGHT'
  const index = side === 'LEFT' ? desk : desk - layout.left
  const row = Math.ceil(index / layout.lanes)
  const offset = (index - 1) % layout.lanes
  return {
    side,
    row,
    lane: row % 2 === 1 ? offset + 1 : layout.lanes - offset,
  }
}
