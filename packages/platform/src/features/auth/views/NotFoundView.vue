<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { authConfig } from '../config'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardContent } from '@mts241alikhlash/ui/card'
import { AlertTriangle } from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

const isAuthenticated = computed(() => Boolean(authStore.user))

function goHome() {
  if (isAuthenticated.value) {
    void router.push(authConfig.value.homeRoute)
  } else {
    void router.push('/login')
  }
}
</script>

<template>
  <div
    :class="[
      'flex flex-col items-center justify-center text-center p-6',
      isAuthenticated ? 'h-[calc(100vh-10rem)]' : 'min-h-screen bg-background',
    ]"
  >
    <Card class="max-w-md w-full">
      <CardContent class="p-8 flex flex-col items-center">
        <div
          class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center text-warning mb-6 ring-8 ring-warning/30"
        >
          <AlertTriangle class="size-8" />
        </div>

        <h1 class="text-7xl font-semibold tracking-tight mb-2">404</h1>
        <h2 class="text-xl font-semibold mb-4">Halaman Tidak Ditemukan</h2>
        <p class="text-sm text-muted-foreground mb-8 leading-relaxed">
          Maaf, halaman yang Anda cari tidak dapat ditemukan atau telah
          dipindahkan ke alamat lain.
        </p>

        <Button
          class="w-full font-semibold shadow-md transition-transform active:scale-[0.98]"
          @click="goHome"
        >
          Kembali ke Beranda
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
