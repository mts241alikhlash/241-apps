import DOMPurify from 'dompurify'
import { isUuid } from './uuid'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'sub',
  'sup',
  'ol',
  'ul',
  'li',
  'span',
  'img',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

const ALLOWED_ATTR = [
  'dir',
  'data-latex',
  'data-file-id',
  'alt',
  'colspan',
  'rowspan',
]

const purifier = DOMPurify(window)
purifier.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IMG' && !isUuid(node.getAttribute('data-file-id'))) {
    node.remove()
  }
})

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function sanitizeQuestionHtml(html: string): string {
  if (!purifier.isSupported) return escapeText(html)
  return purifier.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
