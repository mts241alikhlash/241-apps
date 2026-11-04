<script setup lang="ts">
import { computed } from 'vue'
import AppLayout from './AppLayout.vue'
import { NotFoundView, useAuthStore } from '@/features/platform/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => Boolean(authStore.user))

const breadcrumbs = [
  { title: 'Error', href: '#' },
  { title: '404 Tidak Ditemukan', href: '#' },
]
</script>

<template>
  <AppLayout
    v-if="isAuthenticated"
    :breadcrumbs="breadcrumbs"
  >
    <NotFoundView />
  </AppLayout>
  <NotFoundView v-else />
</template>
