export interface ExamRoomSeat {
  id: string
  roomId: string
  eventId: string
  studentId: string
  classroomId: string
  seatNumber: number
  allowWebClient: boolean
  allowLateEntry: boolean
  createdAt: Date
}

export interface SeatFlagsPatch {
  allowWebClient?: boolean
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
