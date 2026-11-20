export interface ExamRoomSupervisor {
  id: string
  roomId: string
  startsAt: Date
  endsAt: Date
  scheduledUserId: string | null
  actualUserId: string | null
  substitutedByAdminId: string | null
  substituteReason: string | null
  substitutedAt: Date | null
  createdAt: Date
}

export interface NewExamRoomSupervisor {
  roomId: string
  startsAt: Date
  endsAt: Date
  scheduledUserId: string | null
}

export interface NewSupervisorSlot extends NewExamRoomSupervisor {
  actorId: string
  reason: string
}

export interface SupervisorSubstitution {
  supervisorId: string
  actualUserId: string
  substitutedByAdminId: string
  reason: string
  at: Date
  roomId?: string
}
