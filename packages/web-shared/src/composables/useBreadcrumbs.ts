import { inject, onScopeDispose, provide, shallowRef, watchEffect } from 'vue'
import type { InjectionKey, ShallowRef } from 'vue'
import type { BreadcrumbItemType } from '../types/breadcrumb.types'

type BreadcrumbOverride = ShallowRef<BreadcrumbItemType[] | null>

const breadcrumbOverrideKey: InjectionKey<BreadcrumbOverride> =
  Symbol('breadcrumbOverride')

export function provideBreadcrumbs(): BreadcrumbOverride {
  const override: BreadcrumbOverride = shallowRef(null)
  provide(breadcrumbOverrideKey, override)
  return override
}

export function useBreadcrumbs(
  getTrail: () => BreadcrumbItemType[] | null | undefined,
): void {
  const override = inject(breadcrumbOverrideKey, null)
  if (!override) {
    return
  }

  let ours: BreadcrumbItemType[] | null = null

  watchEffect(() => {
    ours = getTrail() ?? null
    override.value = ours
  })

  onScopeDispose(() => {
    if (override.value === ours) {
      override.value = null
    }
  })
}
