import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GradeRecord, NamedOption, QuestionScope } from '../types'
import { gradeLabel } from '../utils/labels'

export const useExamBankStore = defineStore('examBank', () => {
  const scope = ref<QuestionScope | null>(null)
  const subjects = ref<NamedOption[]>([])
  const grades = ref<GradeRecord[]>([])

  const manageAll = computed(() => scope.value?.all === true)

  const gradeNames = computed(() => {
    const names = new Map<string, string>()
    for (const grade of grades.value) {
      names.set(grade.id, gradeLabel(grade))
    }
    for (const pair of scope.value?.pairs ?? []) {
      names.set(
        pair.gradeId,
        gradeLabel({ level: pair.gradeLevel, name: pair.gradeName }),
      )
    }
    return names
  })

  const subjectNames = computed(() => {
    const names = new Map<string, string>()
    for (const subject of subjects.value) names.set(subject.id, subject.name)
    for (const pair of scope.value?.pairs ?? []) {
      if (pair.subjectName) names.set(pair.subjectId, pair.subjectName)
    }
    return names
  })

  function uniqueOptions(
    entries: { id: string; name: string }[],
  ): NamedOption[] {
    const seen = new Map<string, NamedOption>()
    for (const entry of entries) {
      if (!seen.has(entry.id)) seen.set(entry.id, entry)
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'))
  }

  const subjectOptions = computed<NamedOption[]>(() =>
    manageAll.value
      ? uniqueOptions(subjects.value)
      : uniqueOptions(
          (scope.value?.pairs ?? []).map((pair) => ({
            id: pair.subjectId,
            name: subjectNames.value.get(pair.subjectId) ?? '-',
          })),
        ),
  )

  function gradeOptionsFor(subjectId: string | null): NamedOption[] {
    if (manageAll.value) {
      return [...grades.value]
        .sort((a, b) => a.level - b.level)
        .map((grade) => ({ id: grade.id, name: gradeLabel(grade) }))
    }
    return (scope.value?.pairs ?? [])
      .filter((pair) => subjectId === null || pair.subjectId === subjectId)
      .map((pair) => ({
        id: pair.gradeId,
        name: gradeNames.value.get(pair.gradeId) ?? '-',
      }))
      .filter((option, index, all) => {
        return all.findIndex((other) => other.id === option.id) === index
      })
  }

  const gradeOptions = computed(() => gradeOptionsFor(null))

  function subjectName(id: string): string {
    return subjectNames.value.get(id) ?? '-'
  }

  function gradeName(id: string): string {
    return gradeNames.value.get(id) ?? '-'
  }

  return {
    scope,
    subjects,
    grades,
    manageAll,
    subjectOptions,
    gradeOptions,
    gradeOptionsFor,
    subjectName,
    gradeName,
  }
})
