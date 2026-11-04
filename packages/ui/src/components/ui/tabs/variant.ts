import type { ComputedRef, InjectionKey } from 'vue'

export type TabsVariant = 'default' | 'line'

export const tabsVariantKey: InjectionKey<ComputedRef<TabsVariant>> =
  Symbol('tabsVariant')
