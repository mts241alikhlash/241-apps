export interface ExamRoomSeat {
  id: string
  roomId: string
  eventId: string
  studentId: string
  classroomId: string
  seatNumber: number
  allowLateEntry: boolean
  createdAt: Date
}

export interface SeatFlagsPatch {
  allowLateEntry?: boolean
}

export interface NewExamRoomSeat {
  studentId: string
  classroomId: string
}

export interface AutoDistributeInput {
  eventId: string
  roomIds: string[]
  students: NewExamRoomSeat[]
  interleaveByClassroom?: boolean
}

export interface AutoDistributeResult {
  assigned: ExamRoomSeat[]
  unassigned: NewExamRoomSeat[]
}
