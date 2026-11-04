import type {
  Employee,
  EmployeeSavePayload,
  EmployeeUpdatePayload,
} from './types'

export function getPrimaryPosition(employee: Employee): string {
  const primary = employee.positions?.find((ep) => ep.isPrimary)
  return primary?.position?.name ?? '-'
}

export function isTeachingStaff(employee: Employee): boolean {
  const primary = employee.positions?.find((ep) => ep.isPrimary)
  return primary?.position?.category?.code === 'ACADEMIC'
}

const POSITION_CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC: 'Akademik',
  MANAGEMENT: 'Pimpinan',
  FINANCE: 'Keuangan',
  ADMIN: 'Tata Usaha',
}

export function positionCategoryLabel(
  code?: string,
  fallback?: string,
): string {
  if (!code) return fallback ?? '-'
  return POSITION_CATEGORY_LABELS[code] ?? fallback ?? code
}

export function getPrimaryCategoryLabel(employee: Employee): string {
  const primary = employee.positions?.find((ep) => ep.isPrimary)
  const cat = primary?.position?.category
  return positionCategoryLabel(cat?.code, cat?.name)
}

export function buildEmployeeCreatePayload(
  values: Record<string, unknown>,
): EmployeeSavePayload {
  return {
    name: values.name as string,
    nik: values.nik as string,
    gender: values.gender as 'MALE' | 'FEMALE',
    birthPlace: values.birthPlace as string,
    birthDate: values.birthDate as string,
    employmentTypeId: values.employmentTypeId as string,
    positionId: (values.positionId as string) || undefined,
    identifier: (values.nip as string) || (values.nik as string),
    email: (values.email as string) || undefined,
    phone: (values.phone as string) || undefined,
    nip: (values.nip as string) || undefined,
    nuptk: (values.nuptk as string) || undefined,
  }
}

export function buildEmployeeUpdatePayload(
  values: Record<string, unknown>,
): EmployeeUpdatePayload {
  return {
    nip: (values.nip as string) || undefined,
    nuptk: (values.nuptk as string) || undefined,
    employmentTypeId: values.employmentTypeId as string,
  }
}

export interface PositionChangeResult {
  employeeId: string
  positionId: string
  oldPositionLinkId: string | null
}

export function resolvePositionChange(
  employeeId: string | undefined,
  newPositionId: string,
  originalPositionId: string,
  originalPositionLinkId: string | null,
): PositionChangeResult | null {
  if (!employeeId || !newPositionId || newPositionId === originalPositionId) {
    return null
  }
  return {
    employeeId,
    positionId: newPositionId,
    oldPositionLinkId: originalPositionLinkId,
  }
}
