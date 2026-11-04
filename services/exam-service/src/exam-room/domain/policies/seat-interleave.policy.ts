import type { NewExamRoomSeat } from '../entities/exam-room-seat.entity.js'

export function interleaveByClassroom(
  students: NewExamRoomSeat[],
): NewExamRoomSeat[] {
  const buckets = new Map<string, NewExamRoomSeat[]>()
  for (const student of students) {
    const bucket = buckets.get(student.classroomId) ?? []
    bucket.push(student)
    buckets.set(student.classroomId, bucket)
  }
  const queues = [...buckets.values()]
  const ordered: NewExamRoomSeat[] = []
  let moved = true
  while (moved) {
    moved = false
    for (const queue of queues) {
      const next = queue.shift()
      if (next !== undefined) {
        ordered.push(next)
        moved = true
      }
    }
  }
  return ordered
}
