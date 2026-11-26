import { storeToRefs } from 'pinia'
import { assessmentItemService } from '../services/assessmentItemService'
import { useAssessmentItemStore } from '../stores/assessmentItemStore'

export function useAssessmentItem() {
  const store = useAssessmentItemStore()
  const {
    items,
    totalItems,
    loading,
    isSaving,
    formError,
    classrooms,
    subjects,
    semesters,
    selectedClassroomId,
    selectedSubjectId,
    selectedSemesterId,
    assignments,
    teachingAssignment,
  } = storeToRefs(store)

  return {
    items,
    totalItems,
    loading,
    isSaving,
    formError,
    classrooms,
    subjects,
    semesters,
    selectedClassroomId,
    selectedSubjectId,
    selectedSemesterId,
    assignments,
    teachingAssignment,
    fetchRelatedData: assessmentItemService.fetchRelatedData,
    fetchAssignmentsForSemester:
      assessmentItemService.fetchAssignmentsForSemester,
    fetchItems: assessmentItemService.fetchItems,
    fetchGradingItems: assessmentItemService.fetchGradingItems,
    saveItem: assessmentItemService.saveItem,
    deleteItem: assessmentItemService.deleteItem,
  }
}
