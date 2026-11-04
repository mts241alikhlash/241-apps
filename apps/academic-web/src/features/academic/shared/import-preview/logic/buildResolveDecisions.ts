import type { ImportPreviewRow, ImportResolveDecision } from '../types'

export function buildResolveDecisions<TData>(
  rows: ImportPreviewRow<TData>[],
  actions: Record<number, 'update' | 'skip'>,
): ImportResolveDecision<TData>[] {
  return rows
    .filter(
      (row) =>
        (row.status === 'CONFLICT' || row.status === 'SUCCESS') &&
        Boolean(row.data),
    )
    .map((row) => ({
      existingId: row.existingId,
      action:
        row.status === 'SUCCESS' ? 'update' : (actions[row.row] ?? 'skip'),
      data: row.data as TData,
    }))
}
