import { storeToRefs } from 'pinia'
import { classroomReferenceService } from '../services/classroomReferenceService'
import { classroomSupervisorService } from '../services/classroomSupervisorService'
import { useClassroomStore } from '../stores/classroomStore'

export function useClassroomSupervisor() {
  const store = useClassroomStore()
  const {
    employees,
    isSupervisorSaving,
    supervisorFormError,
    classroomSupervisorAssignments,
  } = storeToRefs(store)

  return {
    employees,
    isSupervisorSaving,
    supervisorFormError,
    classroomSupervisorAssignments,
    fetchEmployees: classroomReferenceService.fetchEmployees,
    fetchClassroomSupervisors:
      classroomSupervisorService.fetchClassroomSupervisors,
    saveClassroomSupervisor: classroomSupervisorService.saveClassroomSupervisor,
    deleteClassroomSupervisor:
      classroomSupervisorService.deleteClassroomSupervisor,
  }
}
