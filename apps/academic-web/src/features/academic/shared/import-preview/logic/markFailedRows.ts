import type { ImportPreviewRow, ImportResolveDecision } from '../types'

export function markFailedRows<TData>(
  rows: ImportPreviewRow<TData>[],
  decisions: ImportResolveDecision<TData>[],
  errors: { index: number; error: string }[],
): ImportPreviewRow<TData>[] {
  const messageByData = new Map<TData, string>()
  for (const { index, error } of errors) {
    const data = decisions[index]?.data
    if (data !== undefined) messageByData.set(data, error)
  }
  if (messageByData.size === 0) return rows

  return rows.map((row) => {
    const message =
      row.data === undefined ? undefined : messageByData.get(row.data)
    return message === undefined
      ? row
      : { ...row, status: 'FAILED' as const, error: message }
  })
}
