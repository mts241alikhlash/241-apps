<script setup lang="ts">
import { AppLayout } from '@mts241alikhlash/platform/layout'
import type { BreadcrumbItemType } from '@mts241alikhlash/web-shared/types/breadcrumb.types'
import HeaderAppSwitcher from '@/components/layout/HeaderAppSwitcher.vue'
import { menuSections } from '@/config/menuConfig'

defineProps<{ breadcrumbs?: BreadcrumbItemType[] }>()
</script>

<template>
  <AppLayout
    :menu-sections="menuSections"
    :breadcrumbs="breadcrumbs"
  >
    <template #app-switcher>
      <HeaderAppSwitcher />
    </template>
    <template
      v-if="$slots.breadcrumb"
      #breadcrumb
    >
      <slot name="breadcrumb" />
    </template>
    <slot />
  </AppLayout>
</template>
