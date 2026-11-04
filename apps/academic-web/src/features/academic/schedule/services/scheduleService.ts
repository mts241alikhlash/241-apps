import { classroomApi } from '@/features/academic/classroom'
import { toScheduleLesson } from '../logic/toScheduleLesson'
import { lessonService } from '@/features/academic/lesson'
import { useScheduleStore } from '../stores/scheduleStore'
import { timeSlotApi } from '@/features/academic/time-slot'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { toast } from 'vue-sonner'

export const scheduleService = {
  fetchClassroomsForAdmin: async (queryClassroomId?: string) => {
    const store = useScheduleStore()
    store.isLoadingClassrooms = true
    try {
      const res = await classroomApi.getClassrooms({
        limit: PAGINATION.REFERENCE_LIMIT,
        isActive: true,
      })
      store.classrooms = res.data.data

      if (queryClassroomId) {
        store.selectedClassroomId = queryClassroomId
      }
      return { success: true }
    } catch (e) {
      toast.error(getIndonesianErrorMessage(e, 'Gagal memuat daftar kelas'))
      return { success: false }
    } finally {
      store.isLoadingClassrooms = false
    }
  },

  fetchMySchedule: async () => {
    const store = useScheduleStore()
    store.isLoadingSchedule = true
    store.lessons = []
    store.timeSlots = []

    try {
      const [tsRes, mine] = await Promise.all([
        timeSlotApi.getTimeSlots({ limit: PAGINATION.REFERENCE_LIMIT }),
        lessonService.getMySchedule(),
      ])

      store.timeSlots = (tsRes.data?.data ?? []).map((ts) => ({
        ...ts,
        type: ts.type?.code,
        isLesson: ts.type?.isLesson,
        typeName: ts.type?.name,
        days: ts.type?.days,
      }))

      store.lessons = [...mine.teaching, ...mine.classroom].map(
        toScheduleLesson,
      )
      return { success: true }
    } catch (e) {
      toast.error(getIndonesianErrorMessage(e, 'Gagal memuat jadwal Anda'))
      return { success: false }
    } finally {
      store.isLoadingSchedule = false
    }
  },

  fetchSchedule: async (params: {
    isEmployee: boolean
    employeeId?: string
    selectedClassroomId: string
  }) => {
    const { isEmployee, employeeId, selectedClassroomId } = params
    const store = useScheduleStore()

    if (!isEmployee && !selectedClassroomId) return
    if (isEmployee && !employeeId) return

    store.isLoadingSchedule = true
    store.lessons = []
    store.timeSlots = []

    try {
      const tsPromise = timeSlotApi.getTimeSlots({
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      let lessonPromise

      if (isEmployee) {
        lessonPromise = lessonService.getLessons({
          employeeId: employeeId!,
          limit: PAGINATION.REFERENCE_LIMIT,
        })
      } else {
        lessonPromise = lessonService.getLessonsByClassroom(selectedClassroomId)
      }

      const [tsRes, lessonRes] = await Promise.all([tsPromise, lessonPromise])

      store.timeSlots = (tsRes.data?.data ?? []).map((ts) => ({
        ...ts,
        type: ts.type?.code,
        isLesson: ts.type?.isLesson,
        typeName: ts.type?.name,
        days: ts.type?.days,
      }))
      store.lessons = (Array.isArray(lessonRes.data) ? lessonRes.data : []).map(
        toScheduleLesson,
      )

      return { success: true }
    } catch (e) {
      toast.error(getIndonesianErrorMessage(e, 'Gagal memuat jadwal pelajaran'))
      return { success: false }
    } finally {
      store.isLoadingSchedule = false
    }
  },
}
