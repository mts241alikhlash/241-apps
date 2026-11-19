import { layoutOf, positionOf } from './seat-layout.policy.js'

describe('layoutOf', () => {
  it('splits a full room into two equal blocks', () => {
    expect(layoutOf(32, 4)).toEqual({ lanes: 4, rows: 4, left: 16, right: 16 })
  })

  it('gives the right block the remainder', () => {
    expect(layoutOf(28, 4)).toEqual({ lanes: 4, rows: 4, left: 16, right: 12 })
  })

  it('keeps a small room in the left block first', () => {
    expect(layoutOf(10, 4)).toEqual({ lanes: 4, rows: 2, left: 8, right: 2 })
  })
})

describe('positionOf', () => {
  const l32 = layoutOf(32, 4)
  const l28 = layoutOf(28, 4)

  it.each([
    [1, { side: 'LEFT', row: 1, lane: 1 }],
    [8, { side: 'LEFT', row: 2, lane: 4 }],
    [16, { side: 'LEFT', row: 4, lane: 4 }],
    [17, { side: 'RIGHT', row: 1, lane: 1 }],
    [32, { side: 'RIGHT', row: 4, lane: 4 }],
  ])('places desk %i of a 32-seat room', (desk, expected) => {
    expect(positionOf(desk, l32)).toEqual(expected)
  })

  it('counts the right block within its own side', () => {
    expect(positionOf(28, l28)).toEqual({ side: 'RIGHT', row: 3, lane: 4 })
  })

  it('throws for a desk outside the room', () => {
    expect(() => positionOf(0, l32)).toThrow(RangeError)
    expect(() => positionOf(33, l32)).toThrow(RangeError)
  })
})
