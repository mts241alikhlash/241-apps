export interface Permission {
  id: string
  code: string
  module?: string | null
  action?: string | null
  description?: string | null
  app?: PermissionApp | null
}

export type PermissionApp =
  | 'academic'
  | 'presence'
  | 'payroll'
  | 'admission'
  | 'inventory'
  | 'portal'
  | 'platform'

export const PERMISSION_APP_LABELS: { key: PermissionApp; label: string }[] = [
  { key: 'academic', label: 'Akademik' },
  { key: 'presence', label: 'Presensi' },
  { key: 'payroll', label: 'Penggajian' },
  { key: 'admission', label: 'PPDB' },
  { key: 'inventory', label: 'Inventaris' },
  { key: 'portal', label: 'Portal' },
  { key: 'platform', label: 'Sistem' },
]

export interface Role {
  id: string
  code: string
  name: string
  description?: string | null
  isSystem: boolean
  permissions: Permission[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateRolePayload {
  code: string
  name: string
  description?: string
  permissionIds?: string[]
}

export interface UpdateRolePayload {
  name: string
  description?: string
  permissionIds?: string[]
}

export interface RoleUsage {
  roleCode: string
  steps: number
  workflows: string[]
}
