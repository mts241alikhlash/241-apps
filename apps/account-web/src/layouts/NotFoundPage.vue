<script setup lang="ts">
import { computed } from 'vue'
import AccountLayout from './AccountLayout.vue'
import { NotFoundView, useAuthStore } from '@mts241alikhlash/platform/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => Boolean(authStore.user))
</script>

<template>
  <AccountLayout v-if="isAuthenticated">
    <NotFoundView />
  </AccountLayout>
  <NotFoundView v-else />
</template>
