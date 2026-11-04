import { describe, expect, it } from 'vitest'
import { markFailedRows } from './markFailedRows'
import type { ImportPreviewRow, ImportResolveDecision } from '../types'

interface Row {
  nis: string
}

const first: Row = { nis: '001' }
const second: Row = { nis: '002' }

const rows: ImportPreviewRow<Row>[] = [
  { row: 2, status: 'SUCCESS', data: first },
  { row: 3, status: 'SUCCESS', data: second },
]

const decisions: ImportResolveDecision<Row>[] = [
  { action: 'update', data: first },
  { action: 'update', data: second },
]

describe('markFailedRows', () => {
  it('marks the row the failed decision came from, and only that one', () => {
    const result = markFailedRows(rows, decisions, [
      { index: 1, error: 'NIS "002" is already registered' },
    ])

    expect(result[0]).toBe(rows[0])
    expect(result[1].status).toBe('FAILED')
    expect(result[1].error).toBe('NIS "002" is already registered')
  })

  it('leaves the list untouched when nothing failed', () => {
    expect(markFailedRows(rows, decisions, [])).toBe(rows)
  })

  it('ignores an index the decisions do not reach rather than throwing', () => {
    expect(markFailedRows(rows, decisions, [{ index: 9, error: 'boom' }])).toBe(
      rows,
    )
  })

  it('carries the index across batches, which is what the caller offsets', () => {
    const result = markFailedRows(rows, decisions, [
      { index: 0, error: 'first failed' },
      { index: 1, error: 'second failed' },
    ])

    expect(result.map((r) => r.error)).toEqual([
      'first failed',
      'second failed',
    ])
  })
})
