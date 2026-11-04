export { academicSettingApi } from './api/academicSettingApi'
export { academicSettingService } from './services/academicSettingService'
export { useAcademicSettingStore } from './stores/academicSettingStore'
export { useAcademicSetting } from './composables/useAcademicSetting'
export { PassingScoreSection, WeeklyHolidaysSection } from './components'
export { academicSettingRoutes } from './routes'
export {
  FALLBACK_PASSING_SCORE,
  PASSING_SCORE_MAX,
  PASSING_SCORE_MIN,
} from './constants/passing-score'
export {
  DEFAULT_WEEKLY_HOLIDAY,
  WEEKDAYS,
  formatWeeklyHolidays,
  isWeeklyHoliday,
} from './constants/weekdays'
export type { AcademicSetting, AcademicSettingSavePayload } from './types'
