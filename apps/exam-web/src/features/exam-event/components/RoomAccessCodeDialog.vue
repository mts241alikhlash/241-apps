<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { examEventService } from '../services/examEventService'
import type { RoomAccessCode } from '../types'

const props = defineProps<{
  open: boolean
  roomId: string
  roomName: string
  action?: 'read' | 'rotate'
  canRotate?: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const code = ref<RoomAccessCode | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)
const confirmOpen = ref(false)
const reason = ref('')

async function load() {
  if (props.action === 'rotate') return
  busy.value = true
  const result = await examEventService.loadAccessCode(props.roomId)
  busy.value = false
  if (result.success) {
    code.value = result.data
    error.value = null
  } else {
    error.value = result.error
  }
}

async function rotate() {
  if (reason.value.trim().length < 5) return
  busy.value = true
  const result = await examEventService.rotateToken(
    props.roomId,
    reason.value.trim(),
  )
  busy.value = false
  confirmOpen.value = false
  if (result.success) {
    code.value = result.data
    reason.value = ''
    error.value = null
  } else {
    error.value = result.error
  }
}

const expiresText = () =>
  code.value
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(code.value.expiresAt))
    : '-'

onMounted(load)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Token Ruangan</DialogTitle>
        <DialogDescription>{{ roomName }}</DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ error }}
        </div>
        <div
          v-else
          class="space-y-2 rounded-md border p-4 text-center"
        >
          <p
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            {{
              action === 'rotate'
                ? 'Putar untuk melihat token baru'
                : 'Token aktif saat ini'
            }}
          </p>
          <p class="text-2xl font-semibold tabular-nums tracking-[0.3em]">
            {{ code?.accessCode ?? '······' }}
          </p>
          <p
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            Berlaku sampai {{ expiresText() }} · rotasi
            {{ code?.rotation ?? 0 }}
          </p>
        </div>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Token berganti otomatis setiap 10 menit. Putar sekarang untuk
          membatalkan token lama seketika.
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          v-if="canRotate"
          variant="outline"
          @click="((confirmOpen = true), (reason = ''))"
        >
          Putar Token
        </Button>
        <span v-else />
        <Button @click="emit('update:open', false)">Tutup</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="confirmOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Putar token sekarang?</AlertDialogTitle>
        <AlertDialogDescription>
          Token lama langsung tidak berlaku. Siswa yang sedang mengetik token
          harus meminta token baru kepada pengawas.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div class="px-6 pb-2">
        <FloatingLabelField
          label="Alasan"
          :for="'rotate-reason'"
          floating
        >
          <Textarea
            id="rotate-reason"
            v-model="reason"
            maxlength="300"
            rows="3"
          />
        </FloatingLabelField>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="busy">Batal</AlertDialogCancel>
        <AlertDialogAction
          :disabled="busy || reason.trim().length < 5"
          @click.prevent="rotate"
        >
          Putar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
