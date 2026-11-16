import {
  QUESTION_HEADERS,
  TEMPLATE_IDENTITY,
  TEMPLATE_NOTES,
  TEMPLATE_QUESTIONS,
} from './template-examples.js'
import { buildDocxPackage, paragraph, table } from './docx-package.js'

function documentBody(): string {
  const identity = table(TEMPLATE_IDENTITY)
  const questions = table([
    QUESTION_HEADERS,
    ...TEMPLATE_QUESTIONS.map((question) => [
      question.no,
      question.jenis,
      question.soal,
      ...question.choices,
      question.kunci,
      question.abaikanHarakat,
      question.poin,
    ]),
  ])
  return [
    paragraph('Isi tabel identitas di bawah, lalu tabel soal.'),
    identity,
    paragraph('Tabel soal: satu baris satu soal. Jangan ubah judul kolom.'),
    questions,
    ...TEMPLATE_NOTES.map(paragraph),
  ].join('')
}

export async function buildDocxTemplate(): Promise<Buffer> {
  return buildDocxPackage(documentBody())
}
