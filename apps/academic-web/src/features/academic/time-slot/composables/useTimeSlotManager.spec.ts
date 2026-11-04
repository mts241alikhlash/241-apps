import { describe, expect, it } from 'vitest'
import { useTimeSlotManager } from './useTimeSlotManager'
import type { TimeSlotType } from '../types'

const LESSON: TimeSlotType = {
  id: 'lesson',
  code: 'LESSON',
  name: 'Jam Pelajaran',
  isLesson: true,
  days: [],
  defaultDurationMinutes: 40,
}

const BREAK: TimeSlotType = {
  id: 'break',
  code: 'BREAK',
  name: 'Istirahat',
  isLesson: false,
  days: [],
  defaultDurationMinutes: 15,
}

function manager() {
  const m = useTimeSlotManager()
  m.types.value = [LESSON, BREAK]
  return m
}

describe('adding a row', () => {
  it('leaves the type unchosen rather than picking whichever was created first', () => {
    const { rows, addRow } = manager()
    addRow()
    expect(rows.value[0].typeId).toBe('')
  })

  it('leaves the end time blank until a type says how long the slot runs', () => {
    const { rows, addRow } = manager()
    addRow()
    expect(rows.value[0].endTime).toBe('')
  })

  it('starts the first slot at the start of the school day', () => {
    const { rows, addRow } = manager()
    addRow()
    expect(rows.value[0].startTime).toBe('07:00')
  })

  it('starts every later slot where the one before it ended', () => {
    const { rows, addRow, applyType } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    addRow()

    expect(rows.value[0].endTime).toBe('07:40')
    expect(rows.value[1].startTime).toBe('07:40')
  })
})

describe('choosing a type', () => {
  it('fills the end time from that type own length', () => {
    const { rows, addRow, applyType } = manager()
    addRow()
    applyType(rows.value[0], BREAK.id)
    expect(rows.value[0].endTime).toBe('07:15')
  })

  it('re-derives the end when the type is changed, since that is the point of asking', () => {
    const { rows, addRow, applyType } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    applyType(rows.value[0], BREAK.id)
    expect(rows.value[0].endTime).toBe('07:15')
  })
})

describe('moving a start time', () => {
  it('carries the end with it so the slot keeps its length', () => {
    const { rows, addRow, applyType, applyStart } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    applyStart(rows.value[0], '07:30')

    expect(rows.value[0].endTime).toBe('08:10')
  })

  it('keeps a length typed by hand instead of resetting it to the type default', () => {
    const { rows, addRow, applyType, applyStart } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    rows.value[0].endTime = '07:35'
    applyStart(rows.value[0], '08:00')

    expect(rows.value[0].endTime).toBe('08:35')
  })
})

describe('gapBefore', () => {
  it('is silent when a row starts exactly where the one before it ended', () => {
    const { rows, addRow, applyType, gapBefore } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    addRow()
    applyType(rows.value[1], LESSON.id)

    expect(gapBefore(1)).toBeNull()
  })

  it('reports idle minutes between two slots', () => {
    const { rows, addRow, applyType, applyStart, gapBefore } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)
    addRow()
    applyType(rows.value[1], LESSON.id)
    applyStart(rows.value[1], '07:50')

    expect(gapBefore(1)).toBe(10)
  })

  it('says nothing about the first row, which has nothing before it', () => {
    const { rows, addRow, applyType, gapBefore } = manager()
    addRow()
    applyType(rows.value[0], LESSON.id)

    expect(gapBefore(0)).toBeNull()
  })
})
