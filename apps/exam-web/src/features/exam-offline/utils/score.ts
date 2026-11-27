export type ParsedScore =
  { ok: true; value: number | null } | { ok: false; error: string }

export function parseScore(text: string, maxScore: number): ParsedScore {
  const value = text.trim().replace(',', '.')
  if (value === '') return { ok: true, value: null }
  if (/^-\d/.test(value)) {
    return { ok: false, error: 'Nilai tidak boleh kurang dari 0' }
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return { ok: false, error: 'Nilai harus berupa angka' }
  }
  if (/\.\d{3,}$/.test(value)) {
    return { ok: false, error: 'Nilai paling banyak dua angka desimal' }
  }
  const score = Number(value)
  if (score > maxScore)
    return { ok: false, error: `Nilai maksimal ${maxScore}` }
  return { ok: true, value: score }
}

export function pastedLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => (line.split('\t')[0] ?? '').trim())
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}
