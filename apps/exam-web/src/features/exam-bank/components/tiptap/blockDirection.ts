import { Extension } from '@tiptap/core'

export const BlockDirection = Extension.create({
  name: 'blockDirection',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'listItem', 'bulletList', 'orderedList'],
        attributes: {
          dir: {
            default: 'auto',
            parseHTML: (element) => element.getAttribute('dir') ?? 'auto',
            renderHTML: (attributes) => ({ dir: attributes.dir as string }),
          },
        },
      },
    ]
  },
})
