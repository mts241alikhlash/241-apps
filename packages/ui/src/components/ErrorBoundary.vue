<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { RotateCw, ServerCrash } from '@lucide/vue'
import { Button } from './ui/button'

const error = ref<unknown>(null)

onErrorCaptured((caught) => {
  error.value = caught
  console.error(caught)
  return false
})

function reload() {
  window.location.reload()
}
</script>

<template>
  <div
    v-if="error"
    class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
  >
    <ServerCrash class="text-destructive size-10" />
    <div>
      <p class="text-lg font-medium">Terjadi kesalahan tak terduga</p>
      <p class="text-muted-foreground mt-1 text-sm">
        Halaman ini mengalami error dan tidak bisa ditampilkan. Muat ulang
        untuk mencoba lagi.
      </p>
    </div>
    <Button @click="reload">
      <RotateCw class="size-3.5" />
      Muat ulang
    </Button>
  </div>
  <slot v-else />
</template>
