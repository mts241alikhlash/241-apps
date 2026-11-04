import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GradeRecord, NamedOption } from '@/features/exam-bank/types'
import { gradeLabel } from '@/features/exam-bank/utils/labels'

export const useExamPackageStore = defineStore('examPackage', () => {
  const subjects = ref<NamedOption[]>([])
  const grades = ref<GradeRecord[]>([])

  const subjectOptions = computed<NamedOption[]>(() => subjects.value)
  const gradeOptions = computed<NamedOption[]>(() =>
    grades.value.map((grade) => ({ id: grade.id, name: gradeLabel(grade) })),
  )

  const subjectNames = computed(
    () => new Map(subjects.value.map((subject) => [subject.id, subject.name])),
  )
  const gradeNames = computed(
    () => new Map(gradeOptions.value.map((grade) => [grade.id, grade.name])),
  )

  const subjectName = (id: string): string => subjectNames.value.get(id) ?? '-'
  const gradeName = (id: string): string => gradeNames.value.get(id) ?? '-'

  return {
    subjects,
    grades,
    subjectOptions,
    gradeOptions,
    subjectName,
    gradeName,
  }
})
