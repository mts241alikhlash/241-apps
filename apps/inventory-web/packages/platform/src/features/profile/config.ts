import { ref, markRaw, type Component, type Ref } from 'vue'
import type {
  RawProfileData,
  ProfileStoreData,
  SchoolIdentityProvider,
} from './types'

export interface ExtraTabContext {
  rawProfile: RawProfileData | null
  profileData: ProfileStoreData | null
  getUserId: string
  reloadProfile: () => void
}

export interface ExtraTabPropsContext {
  profileData: ProfileStoreData | null
  rawProfile: RawProfileData | null
  isAdmin: boolean
  reloadProfile: () => void
}

export interface ExtraSheetContext {
  userId: string
  rawProfile: RawProfileData | null
  profileData: ProfileStoreData | null
  reloadProfile: () => void
  isAdmin: boolean
}

export interface ProfileTab {
  value: string
  label: string
  component: Component
  show?: (roles: string[]) => boolean
  isEditable?: boolean
  actionConfig?: { text: string; icon: Component }
  onActionClick?: (ctx: ExtraTabContext) => void
  props?: (ctx: ExtraTabPropsContext) => Record<string, unknown>
}

export interface ExtraSheetConfig {
  component: Component
  props: (ctx: ExtraSheetContext) => Record<string, unknown>
}

export interface ProfileConfig {
  extraTabs: ProfileTab[]
  extraSheets: ExtraSheetConfig[]
  schoolIdentityProvider?: SchoolIdentityProvider
}

export const profileConfig: Ref<ProfileConfig> = ref<ProfileConfig>({
  extraTabs: [],
  extraSheets: [],
})

export function configureProfile(config: Partial<ProfileConfig>) {
  profileConfig.value = {
    ...profileConfig.value,
    ...config,
    extraTabs: config.extraTabs
      ? config.extraTabs.map((t) => ({
          ...t,
          component: markRaw(t.component),
          actionConfig: t.actionConfig
            ? { ...t.actionConfig, icon: markRaw(t.actionConfig.icon) }
            : undefined,
        }))
      : profileConfig.value.extraTabs,
    extraSheets: config.extraSheets
      ? config.extraSheets.map((s) => ({
          ...s,
          component: markRaw(s.component),
        }))
      : profileConfig.value.extraSheets,
  }
}
