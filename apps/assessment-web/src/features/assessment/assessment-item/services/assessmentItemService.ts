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

const NAME_FIELD_ERRORS = new Set([
  'Nama penilaian sudah dipakai di kelas dan mapel ini',
  'Nama penilaian wajib diisi',
])

function extractNameFieldError(err: unknown): string | null {
  const raw = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  const messages = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? [raw]
      : []
  for (const msg of messages) {
    const trimmed = msg.trim()
    if (NAME_FIELD_ERRORS.has(trimmed)) return trimmed
  }
  return null
}

export const assessmentItemService = {
  fetchAssignmentsForSemester: async (semesterId: string | null) => {
    const store = useAssessmentItemStore()
    if (!semesterId) {
      store.assignments = []
      store.classrooms = []
      store.subjects = []
      store.items = []
      store.totalItems = 0
      store.teachingAssignment = null
      return
    }

    try {
      const { rows: assignments } = await loadAssignments({
        semesterId,
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      store.assignments = assignments

      const subjectIds = new Set(assignments.map((a) => a.subjectId))
      const classroomIds = new Set(assignments.map((a) => a.classroomId))
      store.subjects = store.allSubjects.filter((subject) =>
        subjectIds.has(subject.id),
      )
      store.classrooms = store.allClassrooms.filter((classroom) =>
        classroomIds.has(classroom.id),
      )

      if (
        store.selectedClassroomId &&
        !classroomIds.has(store.selectedClassroomId)
      ) {
        store.selectedClassroomId = null
      }
      if (store.selectedSubjectId && !subjectIds.has(store.selectedSubjectId)) {
        store.selectedSubjectId = null
      }
      if (!store.selectedClassroomId && store.classrooms.length === 1) {
        store.selectedClassroomId = store.classrooms[0]?.id ?? null
      }
      if (!store.selectedSubjectId && store.subjects.length === 1) {
        store.selectedSubjectId = store.subjects[0]?.id ?? null
      }
    } catch (err: unknown) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal memuat jadwal mengajar.'),
      )
    }
  },

  fetchRelatedData: async () => {
    const store = useAssessmentItemStore()

    try {
      const [classroomRes, subjectRes, semesterRes] = await Promise.all([
        classroomApi.getClassrooms({ limit: PAGINATION.REFERENCE_LIMIT }),
        subjectApi.getSubjects({ limit: PAGINATION.REFERENCE_LIMIT }),
        semesterApi.getSemesters({ limit: PAGINATION.REFERENCE_LIMIT }),
      ])
      store.allClassrooms = classroomRes.data?.data ?? []
      store.allSubjects = subjectRes.data?.data ?? []
      store.semesters = semesterRes.data?.data ?? []

      store.selectedSemesterId ??=
        store.semesters.find((semester) => semester.isActive)?.id ??
        store.semesters[0]?.id ??
        null

      await assessmentItemService.fetchAssignmentsForSemester(
        store.selectedSemesterId,
      )
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

  fetchGradingItems: async (teachingAssignmentIds: string[]) => {
    const store = useAssessmentItemStore()
    if (teachingAssignmentIds.length === 0) {
      store.items = []
      store.totalItems = 0
      return
    }

    store.loading = true
    try {
      if (teachingAssignmentIds.length === 1) {
        const itemsRes = await assessmentItemApi.getAssessmentItems({
          teachingAssignmentId: teachingAssignmentIds[0],
          limit: 1000,
        })
        store.items = itemsRes.data?.data ?? []
        store.totalItems = store.items.length
        return
      }

      const chunks: string[][] = []
      for (let i = 0; i < teachingAssignmentIds.length; i += 40) {
        chunks.push(teachingAssignmentIds.slice(i, i + 40))
      }
      const responses = await Promise.all(
        chunks.map((chunk) =>
          assessmentItemApi.getAssessmentItems({
            teachingAssignmentIds: chunk.join(','),
            limit: 1000,
          }),
        ),
      )
      store.items = responses.flatMap((res) => res.data?.data ?? [])
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
      const nameError = extractNameFieldError(err)
      if (nameError) {
        store.formError = null
        return {
          success: false as const,
          error: nameError,
          fieldErrors: { name: nameError },
        }
      }
      store.formError = getIndonesianErrorMessage(err, 'Gagal menyimpan tugas.')
      return { success: false as const, error: store.formError }
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
