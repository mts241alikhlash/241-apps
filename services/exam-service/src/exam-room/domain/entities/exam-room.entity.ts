export interface ExamRoom {
  id: string
  eventId: string
  code: string
  name: string
  building: string | null
  capacity: number
  technicianUserId: string | null
  tokenRotation: number
  createdAt: Date
  updatedAt: Date
}

export interface NewExamRoom {
  eventId: string
  code: string
  name: string
  building?: string | null
  capacity: number
  technicianUserId?: string | null
}

export interface ExamRoomEdit {
  code?: string
  name?: string
  building?: string | null
  capacity?: number
  technicianUserId?: string | null
}
