export interface MyDashboardClassroom {
  id: string
  code: string
  name: string | null
}

export interface MyDashboardLesson {
  id: string
  startTime: string
  endTime: string
  subjectName: string
  classroomCode: string | null
  employeeName: string | null
  room: string | null
}

export interface MyDashboardAttendance {
  present: number
  absent: number
  late: number
  excused: number
  sick: number
}

export interface MyDashboardScore {
  id: string
  subjectName: string
  assessmentName: string
  score: number | null
  maxScore: number
}

export interface MyDashboardReportCard {
  id: string
  semesterName: string
}

export interface MyDashboardTeachingLoad {
  classroomCount: number
  subjectCount: number
}

export interface MyDashboardSupervisedClassroom extends MyDashboardClassroom {
  studentCount: number
}

export interface MyDashboardUngradedAssessment {
  id: string
  name: string
  subjectName: string
  classroomCode: string
  gradedCount: number
  studentCount: number
}

export interface MyStudentDashboard {
  classroom: MyDashboardClassroom | null
  todayLessons: MyDashboardLesson[]
  attendance: MyDashboardAttendance
  latestScores: MyDashboardScore[]
  latestReportCard: MyDashboardReportCard | null
}

export interface MyEmployeeDashboard {
  todayLessons: MyDashboardLesson[]
  load: MyDashboardTeachingLoad
  supervisedClassrooms: MyDashboardSupervisedClassroom[]
  ungradedAssessments: MyDashboardUngradedAssessment[]
  ungradedTotal: number
}

export interface MyDashboard {
  semester: { id: string; name: string } | null
  today: { date: string; isWeeklyHoliday: boolean }
  student: MyStudentDashboard | null
  employee: MyEmployeeDashboard | null
}
