import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)

export {
  PERMISSIONS_ANY_KEY,
  RequireAnyPermission,
} from './require-any-permission.decorator.js'
