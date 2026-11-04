import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { academicSettingService } from '../services/academicSettingService'
import { useAcademicSettingStore } from '../stores/academicSettingStore'
import {
  PASSING_SCORE_MAX,
  PASSING_SCORE_MIN,
} from '../constants/passing-score'

function sameHolidays(a: readonly number[], b: readonly number[]): boolean {
  const x = [...a].sort((m, n) => m - n)
  const y = [...b].sort((m, n) => m - n)
  return x.length === y.length && x.every((day, i) => day === y[i])
}

export function useAcademicSetting() {
  const store = useAcademicSettingStore()
  const {
    weeklyHolidays,
    defaultPassingScore,
    loading,
    isSaving,
    loadError,
    formError,
  } = storeToRefs(store)

  const draftHolidays = ref<number[]>([...weeklyHolidays.value])
  const draftPassingScore = ref<number>(defaultPassingScore.value)

  watch(weeklyHolidays, (saved) => {
    draftHolidays.value = [...saved]
  })

  watch(defaultPassingScore, (saved) => {
    draftPassingScore.value = saved
  })

  const isDirty = computed(
    () =>
      !sameHolidays(draftHolidays.value, weeklyHolidays.value) ||
      draftPassingScore.value !== defaultPassingScore.value,
  )

  const isValid = computed(
    () =>
      Number.isInteger(draftPassingScore.value) &&
      draftPassingScore.value >= PASSING_SCORE_MIN &&
      draftPassingScore.value <= PASSING_SCORE_MAX,
  )

  function toggleHoliday(weekday: number) {
    draftHolidays.value = draftHolidays.value.includes(weekday)
      ? draftHolidays.value.filter((day) => day !== weekday)
      : [...draftHolidays.value, weekday]
  }

  function setPassingScore(score: number) {
    draftPassingScore.value = score
  }

  function reset() {
    draftHolidays.value = [...weeklyHolidays.value]
    draftPassingScore.value = defaultPassingScore.value
  }

  async function save() {
    await academicSettingService.saveAcademicSetting({
      weeklyHolidays: draftHolidays.value,
      defaultPassingScore: draftPassingScore.value,
    })
  }

  return {
    draftHolidays,
    draftPassingScore,
    weeklyHolidays,
    defaultPassingScore,
    loading,
    isSaving,
    loadError,
    formError,
    isDirty,
    isValid,
    toggleHoliday,
    setPassingScore,
    reset,
    save,
    fetch: academicSettingService.fetchAcademicSetting,
  }
}
