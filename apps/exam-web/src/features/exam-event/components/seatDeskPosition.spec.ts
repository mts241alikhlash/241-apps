import { describe, expect, it } from 'vitest'
import { deskPosition, gridColumn } from './seatDeskPosition'

describe('deskPosition', () => {
  it('snakes row 1 left to right and row 2 right to left in a 32-seat room', () => {
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8].map((d) => deskPosition(d, 4, 32).lane),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(deskPosition(9, 4, 32)).toEqual({ row: 2, lane: 8 })
    expect(deskPosition(16, 4, 32)).toEqual({ row: 2, lane: 1 })
  })

  it('numbers the 32-seat room row by row across both sides', () => {
    expect(deskPosition(17, 4, 32)).toEqual({ row: 3, lane: 1 })
    expect(deskPosition(28, 4, 32)).toEqual({ row: 4, lane: 5 })
    expect(deskPosition(32, 4, 32)).toEqual({ row: 4, lane: 1 })
  })

  it('fills the partial last row of a 28-seat room from lane 1', () => {
    expect(deskPosition(28, 4, 28)).toEqual({ row: 4, lane: 1 })
    expect(deskPosition(25, 4, 28)).toEqual({ row: 4, lane: 4 })
  })
})

describe('gridColumn', () => {
  it('leaves a gap column between the left lanes and the right lanes', () => {
    expect(gridColumn(4, 4)).toBe(4)
    expect(gridColumn(5, 4)).toBe(6)
    expect(gridColumn(8, 4)).toBe(9)
  })
})
