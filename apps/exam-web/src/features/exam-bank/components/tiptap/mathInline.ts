import { Node, mergeAttributes } from '@tiptap/core'
import { renderLatex } from '../../utils/renderMath'

export interface MathEdit {
  latex: string
  pos: number
}

export interface MathInlineOptions {
  onEdit: (edit: MathEdit) => void
}

export const MathInline = Node.create<MathInlineOptions>({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { onEdit: () => undefined }
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') ?? '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex as string,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-latex]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), String(node.attrs.latex)]
  },

  addNodeView() {
    const { options } = this
    return ({ node, getPos }) => {
      const latex = String(node.attrs.latex)
      const dom = document.createElement('span')
      dom.className = 'cursor-pointer rounded px-0.5 hover:bg-muted'
      dom.setAttribute('data-latex', latex)
      dom.innerHTML = renderLatex(latex)
      dom.addEventListener('click', () => {
        const pos = getPos()
        if (typeof pos === 'number') options.onEdit({ latex, pos })
      })
      return { dom }
    }
  },
})
