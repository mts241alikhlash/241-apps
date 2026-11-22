<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
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
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { examScheduleService } from '../services/examScheduleService'
import type { MakeupParticipant } from '../types'
import { buildParticipantColumns } from './participantColumns'

const props = defineProps<{
  open: boolean
  scheduleId: string
  title: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { hasPermission } = useAuthSession()

const participants = ref<MakeupParticipant[]>([])
const error = ref<string | null>(null)
const loading = ref(false)
const removeTarget = ref<MakeupParticipant | null>(null)
const removing = ref(false)
const removeError = ref<string | null>(null)

async function load() {
  loading.value = true
  const result = await examScheduleService.loadParticipants(props.scheduleId)
  loading.value = false
  if (result.success) {
    participants.value = result.data
    error.value = null
  } else {
    participants.value = []
    error.value = result.error
  }
}

async function confirmRemove() {
  const target = removeTarget.value
  if (!target) return
  removing.value = true
  const result = await examScheduleService.removeParticipant(
    props.scheduleId,
    target.studentId,
  )
  removing.value = false
  removeTarget.value = null
  if (result.success) {
    removeError.value = null
    await load()
  } else {
    removeError.value = result.error
  }
}

const columns = computed(() =>
  buildParticipantColumns({
    canRemove: hasPermission('exam-grading.grade'),
    onRemove: (participant) => {
      removeTarget.value = participant
    },
  }),
)

watch(
  () => props.open,
  (open) => {
    removeTarget.value = null
    removeError.value = null
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
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Peserta Susulan</DialogTitle>
        <DialogDescription>{{ title }}</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Alert
          v-if="removeError"
          variant="destructive"
          class="mb-3"
        >
          <AlertDescription>{{ removeError }}</AlertDescription>
        </Alert>
        <Alert
          v-if="error"
          variant="destructive"
          class="space-y-3"
        >
          <AlertDescription>{{ error }}</AlertDescription>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </Alert>
        <DataTable
          v-else
          mobile="cards"
          hide-pagination
          :columns="columns"
          :data="participants"
          :is-loading="loading"
          item-label="siswa"
        >
          <template #empty>
            <DataTableEmpty message="Belum ada peserta." />
          </template>
        </DataTable>
      </DialogBody>
    </DialogContent>
  </Dialog>

  <AlertDialog
    :open="removeTarget !== null"
    @update:open="removeTarget = $event ? removeTarget : null"
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus peserta?</AlertDialogTitle>
        <AlertDialogDescription>
          {{ removeTarget?.name ?? 'Siswa ini' }} tidak lagi bisa mengikuti
          ujian susulan ini.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="removing">Batal</AlertDialogCancel>
        <AlertDialogAction
          :disabled="removing"
          @click.prevent="confirmRemove"
        >
          Hapus
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
