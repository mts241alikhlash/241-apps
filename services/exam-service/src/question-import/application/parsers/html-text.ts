const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

export function plain(html: string): string {
  return html
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39);/gu, (entity) => ENTITIES[entity] ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function isBlank(html: string): boolean {
  return plain(html) === '' && !/<img\b/u.test(html)
}
