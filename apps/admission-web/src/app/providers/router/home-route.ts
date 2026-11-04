export function resolveHomeRoute(permissions: string[]): string {
  return permissions.includes('admissions.read') ? '/admin' : '/registration'
}

export function deniedRedirect(
  path: string,
  permissions: string[],
): string | { name: 'not-found' } {
  const home = resolveHomeRoute(permissions)
  return path === home ? { name: 'not-found' } : home
}

export function effectivePermissions(permissions: string[]): string[] {
  return permissions.includes('admissions.read')
    ? permissions.filter((code) => code !== 'admissions.apply')
    : permissions
}
