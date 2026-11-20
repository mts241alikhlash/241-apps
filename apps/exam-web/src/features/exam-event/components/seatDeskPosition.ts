export function deskPosition(desk: number, lanes: number, capacity: number) {
  const width = 2 * lanes
  const row = Math.floor((desk - 1) / width) + 1
  const base = (row - 1) * width
  const lane =
    row % 2 === 1 ? desk - base : Math.min(row * width, capacity) - desk + 1
  return { row, lane }
}

export function gridColumn(lane: number, lanes: number) {
  return lane > lanes ? lane + 1 : lane
}
