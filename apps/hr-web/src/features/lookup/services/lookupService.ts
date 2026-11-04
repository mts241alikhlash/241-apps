import { lookupApi } from '../api/lookupApi'
import { useReferenceList } from '@/features/platform/reference-data'
import type {
  AcademicYearOption,
  CalendarEntry,
  CalendarTypeOption,
  PersonOption,
} from '../types'

export const lookupService = {
  listEmployees: async (): Promise<PersonOption[]> => {
    return useReferenceList().read('employees', async () => {
      const res = await lookupApi.getEmployees()
      return (res.data?.data ?? []).map((employee) => ({
        userId: employee.user.id,
        name: employee.user.profile.name,
        identifier: employee.nip ?? employee.user.identifier,
      }))
    })
  },

  listStudents: async (): Promise<PersonOption[]> => {
    return useReferenceList().read('students', async () => {
      const res = await lookupApi.getStudents()
      return (res.data?.data ?? []).map((student) => ({
        userId: student.user.id,
        name: student.user.profile.name,
        identifier: student.user.identifier,
      }))
    })
  },

  listAcademicYears: async (): Promise<AcademicYearOption[]> => {
    return useReferenceList().read('academicYears', async () => {
      const res = await lookupApi.getAcademicYears()
      return res.data?.data ?? []
    })
  },

  listCalendarTypes: async (): Promise<CalendarTypeOption[]> => {
    return useReferenceList().read('calendarTypes', async () => {
      const res = await lookupApi.getCalendarTypes()
      return res.data?.data ?? []
    })
  },

  listCalendarEntries: async (
    academicYearId: string,
    typeId: string,
  ): Promise<CalendarEntry[]> => {
    const res = await lookupApi.getCalendarEntries(academicYearId, typeId)
    return res.data?.data ?? []
  },
}
