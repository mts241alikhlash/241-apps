<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { authConfig } from '../config'
import { ssoService } from '../services/ssoService'

const route = useRoute()

onMounted(() => {
  const redirect = route.query.redirect
  void ssoService.startSignIn(
    typeof redirect === 'string' ? redirect : authConfig.value.homeRoute,
  )
})
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-6">
    <p class="text-sm text-muted-foreground">Mengalihkan ke halaman masuk…</p>
  </div>
</template>
