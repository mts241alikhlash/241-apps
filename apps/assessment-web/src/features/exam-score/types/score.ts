export interface ExamScore {
  id: string
  examSessionId: string
  studentId: string
  studentName: string | null
  studentNis: string | null
  subjectId: string
  classroomId: string
  classroomName: string | null
  semesterId: string
  examTitle: string
  rawScore: number
  maxScore: number
  score: number
  gradedAt: string
}

export interface ExamScoreQuery {
  page?: number
  limit?: number
  semesterId?: string
  classroomId?: string
  subjectId?: string
}
