export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Pilihan Ganda',
  MULTIPLE_RESPONSE: 'Pilihan Ganda Kompleks',
  TRUE_FALSE: 'Benar/Salah',
  SHORT_ANSWER: 'Isian Singkat',
  ESSAY: 'Uraian',
}

export function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABEL[type.toUpperCase()] ?? type
}

export function groupByType<T extends { type: string }>(
  items: T[],
): { type: string; label: string; entries: { item: T; position: number }[] }[] {
  const order: string[] = []
  const buckets = new Map<string, { item: T; position: number }[]>()
  items.forEach((item, position) => {
    const key = item.type.toUpperCase()
    if (!buckets.has(key)) {
      buckets.set(key, [])
      order.push(key)
    }
    buckets.get(key)!.push({ item, position })
  })
  return order.map((key) => ({
    type: key,
    label: questionTypeLabel(key),
    entries: buckets.get(key)!,
  }))
}
