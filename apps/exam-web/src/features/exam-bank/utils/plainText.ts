const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

export function plainExcerpt(html: string, max = 90): string {
  const text = html
    .replace(/<span[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/g, '$$$1$$')
    .replace(/<img\b[^>]*>/g, ' [gambar] ')
    .replace(/<\/(p|li|blockquote|div)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(
      /&(?:amp|lt|gt|quot|#39|nbsp);/g,
      (entity) => ENTITIES[entity] ?? entity,
    )
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > max ? `${text.slice(0, max)}…` : text
}
