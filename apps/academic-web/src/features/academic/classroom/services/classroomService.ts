import type {
  Classroom,
  ClassroomSavePayload,
  ClassroomQueryParams,
} from '../types'
import { classroomApi } from '../api/classroomApi'
import { useClassroomStore } from '../stores/classroomStore'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import {
  isServiceUnavailable,
  serviceUnavailableMessage,
} from '@mts241alikhlash/web-shared/utils/service-error'
import { toast } from 'vue-sonner'
import { useReferenceList } from '@/features/platform/reference-data'

export const classroomService = {
  copyClassroomsToAcademicYear: async (
    sourceAcademicYearId: string,
    targetAcademicYearId: string,
  ) => {
    try {
      const res = await classroomApi.copyClassroomsToAcademicYear({
        sourceAcademicYearId,
        targetAcademicYearId,
      })
      const result = res.data.data
      const created = result?.created ?? 0
      const skipped = result?.skipped ?? 0

      toast.success(
        skipped > 0
          ? `${created} kelas disalin, ${skipped} sudah ada sebelumnya.`
          : `${created} kelas disalin.`,
      )
      return { success: true, result }
    } catch (error: unknown) {
      const msg = getIndonesianErrorMessage(error, 'Gagal menyalin kelas.')
      toast.error(msg)
      return { success: false, error: msg }
    }
  },

  fetchClassrooms: async (params?: ClassroomQueryParams) => {
    const store = useClassroomStore()
    store.loading = true
    store.outage = null
    try {
      const mergedParams = {
        page: params?.page ?? store.currentFilters.page,
        limit: params?.limit ?? store.currentFilters.limit,
        search: params?.search ?? store.currentFilters.search,
        academicYearId:
          params?.academicYearId ?? store.currentFilters.academicYearId,
      }
      store.currentFilters = mergedParams

      const res = await classroomApi.getClassrooms(mergedParams)
      const classrooms: Classroom[] = res.data.data ?? []

      store.classrooms = classrooms.map((classroom) => ({
        ...classroom,
        supervisor:
          classroom.classroomSupervisors?.[0]?.employee ?? classroom.supervisor,
      }))
      store.totalClassrooms = res.data.meta?.total ?? classrooms.length
    } catch (error: unknown) {
      if (isServiceUnavailable(error)) {
        store.classrooms = []
        store.totalClassrooms = 0
        store.outage = serviceUnavailableMessage(error)
      } else {
        toast.error(
          getIndonesianErrorMessage(error, 'Gagal memuat data kelas.'),
        )
      }
    } finally {
      store.loading = false
    }
  },

  fetchClassroomDetail: async (classroomId: string) => {
    const store = useClassroomStore()
    store.manageLoading = true
    try {
      const res = await classroomApi.getClassroomById(classroomId)
      store.currentClassroom = res.data.data
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat detail kelas.'),
      )
    } finally {
      store.manageLoading = false
    }
  },

  saveClassroom: async (id: string | null, payload: ClassroomSavePayload) => {
    const store = useClassroomStore()
    store.isSaving = true
    store.formError = null

    try {
      if (id) {
        await classroomApi.updateClassroom(id, payload)
      } else {
        await classroomApi.createClassroom(payload)
      }
      useReferenceList().invalidate('classrooms')
      return { success: true }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan kelas.',
      )
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },

  deleteClassroom: async (id: string) => {
    try {
      await classroomApi.deleteClassroom(id)
      toast.success('Kelas berhasil dihapus.')
      useReferenceList().invalidate('classrooms')
      return { success: true }
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal menghapus kelas.'))
      return { success: false }
    }
  },
}
