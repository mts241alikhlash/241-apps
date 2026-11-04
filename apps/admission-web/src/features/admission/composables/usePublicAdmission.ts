import { publicAdmissionService } from '../services/publicAdmissionService'

export function usePublicAdmission() {
  return {
    fetchActiveWaves: publicAdmissionService.fetchActiveWaves,
    fetchActiveDownloads: publicAdmissionService.fetchActiveDownloads,
    register: publicAdmissionService.register,
    ensureMyApplication: publicAdmissionService.ensureMyApplication,
    fetchAnnouncements: publicAdmissionService.fetchAnnouncements,
  }
}
