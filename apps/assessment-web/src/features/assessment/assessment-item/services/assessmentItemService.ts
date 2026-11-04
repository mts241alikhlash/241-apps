import { assessmentItemApi } from '../api/assessmentItemApi'
import type { AssessmentItemSavePayload } from '../types'
import { useAssessmentItemStore } from '../stores/assessmentItemStore'
import { classroomApi } from '@/features/lookup/classroom'
import { semesterApi } from '@/features/lookup/semester'
import { subjectApi } from '@/features/lookup/subject'
import { loadAssignments } from '@/features/lookup/teaching-assignment'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { toast } from 'vue-sonner'

export const assessmentItemService = {
  fetchRelatedData: async () => {
    const store = useAssessmentItemStore()

    try {
      const [classroomRes, subjectRes, semesterRes] = await Promise.all([
        classroomApi.getClassrooms({ limit: PAGINATION.REFERENCE_LIMIT }),
        subjectApi.getSubjects({ limit: PAGINATION.REFERENCE_LIMIT }),
        semesterApi.getSemesters({ limit: PAGINATION.REFERENCE_LIMIT }),
      ])
      const allClassrooms = classroomRes.data?.data ?? []
      const allSubjects = subjectRes.data?.data ?? []
      store.semesters = semesterRes.data?.data ?? []

      store.selectedSemesterId ??=
        store.semesters.find((semester) => semester.isActive)?.id ?? null

      const { rows: assignments } = await loadAssignments({
        ...(store.selectedSemesterId
          ? { semesterId: store.selectedSemesterId }
          : {}),
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      store.assignments = assignments

      const subjectIds = new Set(assignments.map((a) => a.subjectId))
      const classroomIds = new Set(assignments.map((a) => a.classroomId))
      store.subjects = allSubjects.filter((subject) =>
        subjectIds.has(subject.id),
      )
      store.classrooms = allClassrooms.filter((classroom) =>
        classroomIds.has(classroom.id),
      )

      if (store.classrooms.length === 1) {
        store.selectedClassroomId ??= store.classrooms[0].id
      }
      if (store.subjects.length === 1) {
        store.selectedSubjectId ??= store.subjects[0].id
      }
    } catch (err: unknown) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal memuat data referensi.'),
      )
    }
  },

  fetchItems: async () => {
    const store = useAssessmentItemStore()
    if (
      !store.selectedClassroomId ||
      !store.selectedSubjectId ||
      !store.selectedSemesterId
    ) {
      store.items = []
      store.totalItems = 0
      store.teachingAssignment = null
      return
    }

    store.loading = true
    try {
      const query = {
        classroomId: store.selectedClassroomId,
        subjectId: store.selectedSubjectId,
        semesterId: store.selectedSemesterId,
        limit: 1,
      }
      const { rows: assignments } = await loadAssignments(query)

      if (assignments.length === 0) {
        store.teachingAssignment = null
        store.items = []
        store.totalItems = 0
        return
      }

      store.teachingAssignment = assignments[0] ?? null
      if (!store.teachingAssignment) return

      const itemsRes = await assessmentItemApi.getAssessmentItems({
        teachingAssignmentId: store.teachingAssignment.id,
        limit: PAGINATION.CHILD_ENTITY_LIMIT,
      })
      store.items = itemsRes.data?.data ?? []
      store.totalItems = store.items.length
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar tugas.'))
    } finally {
      store.loading = false
    }
  },

  saveItem: async (payload: AssessmentItemSavePayload, id?: string) => {
    const store = useAssessmentItemStore()
    store.isSaving = true
    store.formError = null
    try {
      if (id) {
        await assessmentItemApi.updateAssessmentItem(id, payload)
      } else {
        await assessmentItemApi.createAssessmentItem(payload)
      }
      return { success: true }
    } catch (err: unknown) {
      store.formError = getIndonesianErrorMessage(err, 'Gagal menyimpan tugas.')
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },

  deleteItem: async (id: string) => {
    try {
      await assessmentItemApi.deleteAssessmentItem(id)
      return { success: true }
    } catch (err: unknown) {
      return {
        success: false,
        error: getIndonesianErrorMessage(err, 'Gagal menghapus tugas.'),
      }
    }
  },
}
