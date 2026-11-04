import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { assessmentWeightApi } from '../api/assessmentWeightApi'
import {
  ASSESSMENT_TYPE_ORDER,
  ASSESSMENT_WEIGHT_TOTAL,
  type AssessmentWeight,
} from '../types'
import type { AssessmentType } from '@/features/assessment/assessment-item'

function emptyWeights(): Record<AssessmentType, number> {
  return {
    DAILY: 0,
    ASSIGNMENT: 0,
    PRACTICAL: 0,
    MIDTERM: 0,
    FINAL: 0,
  }
}

export function useAssessmentWeights() {
  const weights = ref<Record<AssessmentType, number>>(emptyWeights())
  const loading = ref(false)
  const isSaving = ref(false)

  const total = computed(() =>
    ASSESSMENT_TYPE_ORDER.reduce((sum, type) => sum + weights.value[type], 0),
  )

  const isBalanced = computed(
    () => Math.round(total.value * 100) / 100 === ASSESSMENT_WEIGHT_TOTAL,
  )

  const remaining = computed(
    () => Math.round((ASSESSMENT_WEIGHT_TOTAL - total.value) * 100) / 100,
  )

  async function fetch(teachingAssignmentId: string) {
    loading.value = true
    try {
      const res = await assessmentWeightApi.getWeights(teachingAssignmentId)
      const next = emptyWeights()
      for (const row of res.data?.data ?? []) {
        next[row.type] = Math.round(row.weight * 100)
      }
      weights.value = next
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat bobot penilaian.'),
      )
      weights.value = emptyWeights()
    } finally {
      loading.value = false
    }
  }

  async function save(teachingAssignmentId: string): Promise<boolean> {
    if (!isBalanced.value) return false

    isSaving.value = true
    try {
      const payload: AssessmentWeight[] = ASSESSMENT_TYPE_ORDER.map((type) => ({
        type,
        weight: weights.value[type] / 100,
      }))
      await assessmentWeightApi.replaceWeights({
        teachingAssignmentId,
        weights: payload,
      })
      toast.success('Bobot penilaian disimpan.')
      return true
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal menyimpan bobot penilaian.'),
      )
      return false
    } finally {
      isSaving.value = false
    }
  }

  function applyDefault() {
    weights.value = { ...emptyWeights(), DAILY: 40, MIDTERM: 30, FINAL: 30 }
  }

  return {
    weights,
    loading,
    isSaving,
    total,
    isBalanced,
    remaining,
    fetch,
    save,
    applyDefault,
  }
}
