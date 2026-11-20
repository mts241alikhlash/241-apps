import { deskOf, layoutOf, positionOf } from './seat-layout.policy.js'

describe('layoutOf', () => {
  it('numbers a full 32-seat room as 4 rows of 8 lanes split 16 and 16', () => {
    expect(layoutOf(32, 4)).toEqual({ lanes: 4, rows: 4, left: 16, right: 16 })
  })

  it('counts the 28-seat room with row 4 filled from lane 1 and lanes 5..8 empty', () => {
    expect(layoutOf(28, 4)).toEqual({ lanes: 4, rows: 4, left: 16, right: 12 })
  })

  it('fills a small room row by row from lane 1', () => {
    expect(layoutOf(10, 4)).toEqual({ lanes: 4, rows: 2, left: 6, right: 4 })
  })
})

describe('positionOf', () => {
  const l32 = layoutOf(32, 4)
  const l28 = layoutOf(28, 4)

  it.each([
    [1, { side: 'LEFT', row: 1, lane: 1 }],
    [4, { side: 'LEFT', row: 1, lane: 4 }],
    [5, { side: 'RIGHT', row: 1, lane: 5 }],
    [8, { side: 'RIGHT', row: 1, lane: 8 }],
    [9, { side: 'RIGHT', row: 2, lane: 8 }],
    [12, { side: 'RIGHT', row: 2, lane: 5 }],
    [16, { side: 'LEFT', row: 2, lane: 1 }],
    [17, { side: 'LEFT', row: 3, lane: 1 }],
    [24, { side: 'RIGHT', row: 3, lane: 8 }],
    [25, { side: 'RIGHT', row: 4, lane: 8 }],
    [28, { side: 'RIGHT', row: 4, lane: 5 }],
    [32, { side: 'LEFT', row: 4, lane: 1 }],
  ])('places desk %i of a 32-seat room', (desk, expected) => {
    expect(positionOf(desk, l32)).toEqual(expected)
  })

  it('snakes row 2 from lane 8 down to lane 1 for desks 9 to 16', () => {
    expect(
      [9, 10, 11, 12, 13, 14, 15, 16].map((d) => positionOf(d, l32).lane),
    ).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('places the 28-seat room with desks 28..25 on lanes 1..4 of row 4', () => {
    expect([28, 27, 26, 25].map((d) => positionOf(d, l28))).toEqual([
      { side: 'LEFT', row: 4, lane: 1 },
      { side: 'LEFT', row: 4, lane: 2 },
      { side: 'LEFT', row: 4, lane: 3 },
      { side: 'LEFT', row: 4, lane: 4 },
    ])
    expect(positionOf(17, l28)).toEqual({ side: 'LEFT', row: 3, lane: 1 })
    expect(positionOf(24, l28)).toEqual({ side: 'RIGHT', row: 3, lane: 8 })
  })

  it('throws for a desk outside the room', () => {
    expect(() => positionOf(0, l32)).toThrow(RangeError)
    expect(() => positionOf(33, l32)).toThrow(RangeError)
    expect(() => positionOf(29, l28)).toThrow(RangeError)
  })
})

describe('deskOf', () => {
  it('is the inverse of positionOf for every desk of both rooms', () => {
    for (const capacity of [32, 28]) {
      const layout = layoutOf(capacity, 4)
      for (let desk = 1; desk <= capacity; desk++) {
        const { row, lane } = positionOf(desk, layout)
        expect(deskOf(row, lane, layout)).toBe(desk)
      }
    }
  })

  it('returns undefined for cells that do not exist', () => {
    const l28 = layoutOf(28, 4)
    expect(deskOf(4, 1, l28)).toBe(28)
    expect(deskOf(4, 4, l28)).toBe(25)
    expect(deskOf(4, 5, l28)).toBeUndefined()
    expect(deskOf(4, 8, l28)).toBeUndefined()
    expect(deskOf(1, 9, l28)).toBeUndefined()
  })
})
