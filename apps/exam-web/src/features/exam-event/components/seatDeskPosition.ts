export function deskPosition(index: number, lanes: number) {
  const row = Math.ceil(index / lanes)
  const offset = (index - 1) % lanes
  return { row, lane: row % 2 === 1 ? offset + 1 : lanes - offset }
}
