import type { MyDashboard } from '../types'

export interface DashboardPanel {
  value: 'student' | 'employee' | 'institution'
  label: string
}

export function selectDashboardPanels(
  dashboard: MyDashboard | null,
  canReadInstitution: boolean,
): DashboardPanel[] {
  if (canReadInstitution) return [{ value: 'institution', label: 'Sekolah' }]

  const panels: DashboardPanel[] = []
  if (dashboard?.student) panels.push({ value: 'student', label: 'Siswa' })
  if (dashboard?.employee) panels.push({ value: 'employee', label: 'Guru' })
  return panels
}
