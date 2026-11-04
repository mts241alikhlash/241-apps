import { Node, mergeAttributes } from '@tiptap/core'
import { loadExamImage } from '../../composables/useExamImage'

export const ExamImage = Node.create({
  name: 'examImage',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) =>
          attributes.fileId
            ? { 'data-file-id': attributes.fileId as string }
            : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-file-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ({ node }) => {
      const fileId = String(node.attrs.fileId)
      const dom = document.createElement('img')
      dom.className = 'inline-block max-h-40 max-w-full rounded-md align-middle'
      dom.dataset.fileId = fileId
      loadExamImage(fileId)
        .then((url) => {
          dom.src = url
        })
        .catch(() => {
          dom.alt = 'Gambar tidak bisa dimuat'
        })
      return { dom }
    }
  },
})
