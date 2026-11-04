<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { examScheduleService } from '../services/examScheduleService'

const props = defineProps<{
  open: boolean
  scheduleId: string
  title: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const code = ref('')
const error = ref<string | null>(null)
const busy = ref(false)
const confirmOpen = ref(false)

async function load() {
  busy.value = true
  const result = await examScheduleService.loadAccessCode(props.scheduleId)
  busy.value = false
  if (result.success) code.value = result.data.accessCode
  else error.value = result.error
}

async function rotate() {
  busy.value = true
  const result = await examScheduleService.rotateAccessCode(props.scheduleId)
  busy.value = false
  confirmOpen.value = false
  if (result.success) {
    code.value = result.data.accessCode
    error.value = null
  } else {
    error.value = result.error
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(code.value)
    toast.success('Token disalin.')
  } catch {
    toast.error('Tidak dapat menyalin. Salin token secara manual.')
  }
}

watch(
  () => props.open,
  (open) => {
    code.value = ''
    error.value = null
    confirmOpen.value = false
    if (open) void load()
  },
  { immediate: true },
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Token Ujian</DialogTitle>
        <DialogDescription>{{ title }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ error }}
        </div>
        <p
          v-if="code"
          data-test="code"
          class="text-center text-3xl font-semibold tracking-[0.3em] tabular-nums"
        >
          <span class="sr-only">Token ujian: </span>{{ code }}
        </p>
        <p
          v-else-if="busy"
          class="text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Memuat token…
        </p>
        <Button
          v-if="error && !code && !busy"
          variant="outline"
          class="mx-auto flex"
          @click="load"
        >
          Coba lagi
        </Button>
        <p
          v-if="code"
          class="text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Bagikan token ini kepada siswa saat ujian dimulai.
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          :disabled="busy || !code"
          @click="confirmOpen = true"
        >
          Ganti Token
        </Button>
        <Button
          :disabled="!code"
          @click="copy"
        >
          Salin
        </Button>
      </DialogFooter>
    </DialogContent>

    <AlertDialog v-model:open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ganti token?</AlertDialogTitle>
          <AlertDialogDescription>
            Token lama berhenti berlaku. Siswa yang belum masuk harus memakai
            token yang baru.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            :disabled="busy"
            @click="rotate"
          >
            Ya, ganti
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Dialog>
</template>
