<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { AppSwitcher } from '@mts241alikhlash/ui'
import { authConfig, useSsoApps } from '@/features/platform/auth'

interface SwitcherApp {
  key: string
  name: string
  logo: string
}

const LOGO = '/logo.webp'
const FALLBACK_NAME = '241 Academic'

const { apps, load } = useSsoApps()
const currentKey = computed(() => authConfig.value.ssoApp)

const items = computed<SwitcherApp[]>(() => {
  const listed = apps.value.map((app) => ({
    key: app.key,
    name: app.label,
    logo: LOGO,
  }))
  return listed.some((app) => app.key === currentKey.value)
    ? listed
    : [{ key: currentKey.value, name: FALLBACK_NAME, logo: LOGO }, ...listed]
})

function open(app: SwitcherApp) {
  if (app.key === currentKey.value) return
  const target = apps.value.find((candidate) => candidate.key === app.key)
  if (target) window.location.assign(target.url)
}

onMounted(() => {
  void load()
})
</script>

<template>
  <AppSwitcher
    :apps="items"
    :current-key="currentKey"
    @select="open"
  />
</template>
