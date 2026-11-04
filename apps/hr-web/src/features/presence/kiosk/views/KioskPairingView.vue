<script setup lang="ts">
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Label } from '@mts241alikhlash/ui/label'
import { ScanLine } from '@lucide/vue'
import { ref } from 'vue'
import { kioskService } from '../services/kioskService'

const emit = defineEmits<{ paired: [] }>()

const token = ref('')
const error = ref('')

const pairing = ref(false)

async function pair() {
  if (!token.value.trim()) {
    error.value = 'Masukkan token perangkat.'
    return
  }
  pairing.value = true
  const paired = await kioskService.pair(token.value.trim())
  pairing.value = false
  if (!paired) {
    error.value = 'Token tidak dikenali atau server tidak terjangkau.'
    return
  }
  token.value = ''
  emit('paired')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-950 p-6">
    <div class="w-full max-w-md space-y-6 rounded-xl bg-slate-900 p-8">
      <div class="flex flex-col items-center gap-3 text-center">
        <ScanLine class="h-10 w-10 text-slate-400" />
        <h1 class="text-xl font-semibold text-white">
          Perangkat Belum Terhubung
        </h1>
        <p class="text-sm text-slate-400">
          Masukkan token yang ditampilkan saat gerbang ini didaftarkan. Token
          hanya muncul sekali. Jika hilang, terbitkan ulang dari menu Perangkat
          Gerbang.
        </p>
      </div>

      <div class="space-y-2">
        <Label
          for="device-token"
          class="text-slate-300"
          >Token perangkat</Label
        >
        <Input
          id="device-token"
          v-model="token"
          type="password"
          autocomplete="off"
          class="bg-slate-800 font-mono text-white"
          @keyup.enter="pair"
        />
        <p
          v-if="error"
          class="text-sm text-red-400"
        >
          {{ error }}
        </p>
      </div>

      <Button
        class="w-full"
        size="lg"
        :disabled="pairing"
        @click="pair"
        >Hubungkan</Button
      >
    </div>
  </div>
</template>
