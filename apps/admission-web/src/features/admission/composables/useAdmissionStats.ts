import { storeToRefs } from 'pinia'
import { applicationService } from '../services/applicationService'
import { statsService } from '../services/statsService'
import { waveService } from '../services/waveService'
import { useApplicationStore } from '../stores/applicationStore'
import { useStatsStore } from '../stores/statsStore'
import { useWaveStore } from '../stores/waveStore'

export function useAdmissionStats() {
  const { stats, loading, error } = storeToRefs(useStatsStore())
  const { waves } = storeToRefs(useApplicationStore())
  const { academicYears } = storeToRefs(useWaveStore())

  return {
    stats,
    loading,
    error,
    waves,
    academicYears,
    fetchStats: statsService.fetchStats,
    fetchWaves: applicationService.fetchWaves,
    fetchAcademicYears: waveService.fetchAcademicYears,
  }
}
