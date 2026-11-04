import 'vue-router'
import type { BreadcrumbItemType } from './breadcrumb.types'

export type UserRole = string

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    allowedRoles?: UserRole[]
    requiredPermission?: string
    requiredAnyPermission?: string[]
    title?: string
    breadcrumbs?: BreadcrumbItemType[]
  }
}
