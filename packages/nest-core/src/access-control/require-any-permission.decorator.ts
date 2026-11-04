import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_ANY_KEY = 'permissionsAny'
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions)
