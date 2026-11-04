import katex from 'katex'

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

export function decodeEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => ENTITIES[entity] ?? entity,
  )
}

export function renderLatex(latex: string): string {
  if (latex.trim() === '') return ''
  return katex.renderToString(latex, { throwOnError: false, output: 'html' })
}

const FORMULA = /<span\b[^>]*\sdata-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/g

export function renderMath(html: string): string {
  return html.replace(FORMULA, (_match, latex: string) =>
    renderLatex(decodeEntities(latex)),
  )
}
