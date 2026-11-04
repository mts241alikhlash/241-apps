import { teachingAssignmentApi } from '../api/teachingAssignmentApi'
import { loadAssignments } from './loadAssignments'
import { useTeachingAssignmentStore } from '../stores/teachingAssignmentStore'
import { isEveryClassroom } from '../constants/filters'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { toast } from 'vue-sonner'
import { useReferenceList } from '@/features/platform/reference-data'
import { classroomApi } from '@/features/academic/classroom'
import { subjectApi } from '@/features/academic/subject'
import { employeeRosterApi } from '@/features/academic/shared/roster/rosterApi'
import { curriculumApi } from '@/features/academic/curriculum'
import { curriculumSubjectApi } from '@/features/academic/curriculum-subject'
import type {
  TeachingAssignmentCreatePayload,
  TeachingAssignmentUpdatePayload,
  TeachingAssignmentQueryParams,
  TeachingAssignmentSubjectOption,
} from '../types'

async function fetchAssignableSubjects(): Promise<
  TeachingAssignmentSubjectOption[]
> {
  const activeCurriculum = await curriculumApi
    .getCurricula({ isActive: true })
    .then((res) => (res.data?.data ?? []).find((c) => c.isActive))
    .catch(() => undefined)

  if (!activeCurriculum) {
    const subjectRes = await subjectApi.getSubjects({
      limit: PAGINATION.REFERENCE_LIMIT,
    })
    return subjectRes.data?.data ?? []
  }

  const curriculumSubjectRes = await curriculumSubjectApi.getCurriculumSubjects(
    {
      curriculumId: activeCurriculum.id,
      limit: PAGINATION.REFERENCE_LIMIT,
    },
  )

  return (curriculumSubjectRes.data?.data ?? [])
    .map((cs) => cs.subject)
    .filter((s): s is NonNullable<typeof s> => s != null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const teachingAssignmentService = {
  fetchFilterOptions: async () => {
    const store = useTeachingAssignmentStore()
    try {
      const [classrooms, employees, subjects] = await Promise.all([
        useReferenceList().read('classrooms', async () => {
          const res = await classroomApi.getClassrooms({
            limit: PAGINATION.REFERENCE_LIMIT,
          })
          return res.data?.data ?? []
        }),
        useReferenceList().read('employees', async () => {
          const res = await employeeRosterApi.getEmployees({
            limit: PAGINATION.REFERENCE_LIMIT,
          })
          return res.data?.data ?? []
        }),
        fetchAssignableSubjects(),
      ])
      store.classrooms = classrooms
      store.subjects = subjects
      store.employees = employees
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data referensi.'),
      )
    }
  },

  fetchTeachingAssignments: async () => {
    const store = useTeachingAssignmentStore()
    store.loading = true
    try {
      const params: TeachingAssignmentQueryParams = {
        page: store.currentPage,
        limit: store.pageSize,
        ...(isEveryClassroom(store.selectedClassroomId)
          ? {}
          : { classroomId: store.selectedClassroomId }),
      }

      const { rows, total } = await loadAssignments(params)
      store.items = rows
      store.totalItems = total
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(
          error,
          'Gagal memuat data penugasan mengajar.',
        ),
      )
    } finally {
      store.loading = false
    }
  },

  saveTeachingAssignment: async (
    id: string | null,
    payload: TeachingAssignmentCreatePayload | TeachingAssignmentUpdatePayload,
  ) => {
    const store = useTeachingAssignmentStore()
    store.isSaving = true
    store.formError = null
    try {
      const { employeeId, subjectId, semesterId } = payload

      if (id) {
        await teachingAssignmentApi.updateTeachingAssignment(id, {
          employeeId,
          subjectId,
          semesterId,
          ...('classroomId' in payload
            ? { classroomId: payload.classroomId }
            : {}),
        })
        toast.success('Berhasil memperbarui penugasan mengajar')
      } else {
        const res = await teachingAssignmentApi.createTeachingAssignment({
          employeeId,
          subjectId,
          semesterId,
          classroomIds: 'classroomIds' in payload ? payload.classroomIds : [],
        })
        const { created = [], skipped = [] } = res.data?.data ?? {}
        toast.success(
          skipped.length > 0
            ? `${created.length} kelas ditambahkan, ${skipped.length} dilewati (sudah ada).`
            : `Berhasil menambah penugasan untuk ${created.length} kelas`,
        )
      }
      await teachingAssignmentService.fetchTeachingAssignments()
      return { success: true }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan penugasan mengajar.',
      )
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },

  deleteTeachingAssignment: async (id: string) => {
    try {
      await teachingAssignmentApi.deleteTeachingAssignment(id)
      toast.success('Penugasan mengajar berhasil dihapus')
      await teachingAssignmentService.fetchTeachingAssignments()
      return { success: true }
    } catch (error: unknown) {
      const errorMessage = getIndonesianErrorMessage(
        error,
        'Gagal menghapus penugasan mengajar.',
      )
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },
}
