import StarterKit from '@tiptap/starter-kit'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table'
import { BlockDirection } from './blockDirection'
import { ExamImage } from './examImage'
import { MathInline, type MathEdit } from './mathInline'

export function buildExtensions(onEdit: (edit: MathEdit) => void) {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      link: false,
    }),
    Subscript,
    Superscript,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    BlockDirection,
    ExamImage,
    MathInline.configure({ onEdit }),
  ]
}
