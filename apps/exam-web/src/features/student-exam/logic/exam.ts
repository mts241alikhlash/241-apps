import type { AnswerPayload, MyExam, PaperQuestion } from '../types'

export function formatRemaining(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

export type ExamGroup = 'BISA_DIKERJAKAN' | 'AKAN_DATANG' | 'SELESAI'

export const GROUP_LABEL: Record<ExamGroup, string> = {
  BISA_DIKERJAKAN: 'Bisa dikerjakan',
  AKAN_DATANG: 'Akan datang',
  SELESAI: 'Selesai',
}

export function groupExams(exams: MyExam[]): Record<ExamGroup, MyExam[]> {
  const groups: Record<ExamGroup, MyExam[]> = {
    BISA_DIKERJAKAN: [],
    AKAN_DATANG: [],
    SELESAI: [],
  }
  for (const exam of exams) {
    const group: ExamGroup =
      exam.status === 'OPEN' || exam.status === 'IN_PROGRESS'
        ? 'BISA_DIKERJAKAN'
        : exam.status === 'UPCOMING'
          ? 'AKAN_DATANG'
          : 'SELESAI'
    groups[group].push(exam)
  }
  return groups
}

export function displayTitle(exam: MyExam): string {
  const subject = exam.subjectName?.trim()
  return subject ? `${exam.type} - ${subject}` : exam.title
}

export function isAnswered(
  question: PaperQuestion,
  answer: AnswerPayload | undefined,
): boolean {
  if (!answer) return false
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return 'key' in answer && Boolean(answer.key)
    case 'MULTIPLE_RESPONSE':
      return 'keys' in answer && answer.keys.length > 0
    case 'TRUE_FALSE':
      return 'value' in answer && typeof answer.value === 'boolean'
    case 'SHORT_ANSWER':
    case 'ESSAY':
      return 'text' in answer && answer.text.trim().length > 0
    default:
      return false
  }
}

export function countAnswered(
  questions: PaperQuestion[],
  answers: Map<string, AnswerPayload>,
): number {
  return questions.filter((question) =>
    isAnswered(question, answers.get(question.id)),
  ).length
}
