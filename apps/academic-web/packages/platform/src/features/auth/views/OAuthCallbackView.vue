<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@mts241alikhlash/ui/button'
import { authConfig } from '../config'
import { ssoService } from '../services/ssoService'

const route = useRoute()
const router = useRouter()
const failed = ref(false)

async function complete() {
  const target = await ssoService.completeSignIn(
    route.query.code,
    route.query.state,
  )
  if (target) {
    await router.replace(target)
    return
  }
  failed.value = true
}

function retry() {
  void ssoService.startSignIn(authConfig.value.homeRoute)
}

onMounted(complete)
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-6">
    <div
      class="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm"
    >
      <h1 class="text-lg font-semibold tracking-tight">
        {{ failed ? 'Sesi masuk tidak valid' : 'Menyelesaikan masuk' }}
      </h1>
      <p class="mt-2 text-sm text-muted-foreground text-balance">
        {{
          failed
            ? 'Tautan masuk sudah dipakai atau kedaluwarsa. Silakan coba lagi.'
            : 'Mohon tunggu sebentar.'
        }}
      </p>
      <div
        v-if="!failed"
        class="mt-6 flex justify-center"
      >
        <span
          class="size-5 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-label="Memuat"
        />
      </div>
      <Button
        v-else
        type="button"
        class="mt-6 w-full cursor-pointer"
        @click="retry"
      >
        Coba lagi
      </Button>
    </div>
  </div>
</template>
