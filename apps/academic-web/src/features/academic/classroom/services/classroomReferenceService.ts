import { useClassroomStore } from '../stores/classroomStore'
import { academicYearApi } from '@/features/academic/academic-year'
import { employeeRosterApi } from '@/features/academic/shared/roster/rosterApi'
import { gradeApi } from '@/features/academic/grade'
import { semesterApi } from '@/features/academic/semester'
import { useReferenceList } from '@/features/platform/reference-data'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { toast } from 'vue-sonner'

export const classroomReferenceService = {
  fetchAcademicYears: async () => {
    const store = useClassroomStore()
    try {
      store.academicYears = await useReferenceList().read(
        'academicYears',
        async () => {
          const res = await academicYearApi.getAcademicYears({
            limit: PAGINATION.REFERENCE_LIMIT,
          })
          return res.data.data ?? []
        },
      )
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data tahun ajaran.'),
      )
    }
  },

  fetchGrades: async () => {
    const store = useClassroomStore()
    try {
      store.grades = await useReferenceList().read('grades', async () => {
        const res = await gradeApi.getGrades({
          limit: PAGINATION.REFERENCE_LIMIT,
        })
        return res.data.data ?? []
      })
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data tingkat kelas.'),
      )
    }
  },

  fetchEmployees: async () => {
    const store = useClassroomStore()
    try {
      store.employees = await useReferenceList().read('employees', async () => {
        const res = await employeeRosterApi.getEmployees({
          limit: PAGINATION.REFERENCE_LIMIT,
        })
        return res.data.data ?? []
      })
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data guru.'))
    }
  },

  fetchSemesters: async () => {
    const store = useClassroomStore()
    try {
      store.semesters = await useReferenceList().read('semesters', async () => {
        const res = await semesterApi.getSemesters({
          limit: PAGINATION.REFERENCE_LIMIT,
        })
        return res.data.data ?? []
      })
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data semester.'),
      )
    }
  },
}
