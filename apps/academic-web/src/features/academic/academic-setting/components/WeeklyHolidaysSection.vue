<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Loader2 } from '@lucide/vue'
import { WEEKDAYS } from '../constants/weekdays'

defineProps<{
  draft: number[]
  isSaving: boolean
  canEdit?: boolean
}>()

const emit = defineEmits<{
  toggle: [weekday: number]
  save: []
  reset: []
}>()

const showDialog = ref(false)

const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DISPLAY_WEEKDAYS = DISPLAY_ORDER.map((value) =>
  WEEKDAYS.find((day) => day.value === value)!,
)

function openDialog() {
  showDialog.value = true
}

function closeDialog() {
  emit('reset')
  showDialog.value = false
}

function handleSave() {
  emit('save')
  showDialog.value = false
}
</script>

<template>
  <div class="flex items-center gap-4 flex-wrap">
    <div class="flex-1 min-w-0">
      <span class="text-sm text-muted-foreground"
        >Hari Libur yang Berlaku&ensp;:&ensp;</span
      >
      <span class="text-sm font-semibold text-foreground">
        {{
          DISPLAY_WEEKDAYS.filter((d) => draft.includes(d.value))
            .map((d) => d.label)
            .join(', ') || '-'
        }}
      </span>
    </div>

    <Button
      v-if="canEdit"
      variant="outline"
      size="sm"
      class="h-8 text-xs shrink-0"
      @click="openDialog"
    >
      Edit
    </Button>
  </div>

  <Dialog
    :open="showDialog"
    @update:open="(open) => (open ? openDialog() : closeDialog())"
  >
    <DialogContent class="sm:max-w-xs flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b shrink-0">
        <DialogTitle>Hari Libur Mingguan</DialogTitle>
      </DialogHeader>

      <div class="px-6 py-5 space-y-3">
        <p class="text-xs text-muted-foreground">
          Centang hari yang sekolah tidak aktif setiap minggunya.
        </p>
        <div class="space-y-2.5">
          <label
            v-for="day in DISPLAY_WEEKDAYS"
            :key="day.value"
            class="flex items-center gap-3 py-1 cursor-pointer select-none"
            :class="{ 'opacity-60 cursor-not-allowed': isSaving }"
          >
            <Checkbox
              :id="`holiday-${day.value}`"
              :model-value="draft.includes(day.value)"
              :disabled="isSaving"
              @update:model-value="emit('toggle', day.value)"
            />
            <span class="text-sm font-medium text-foreground">{{
              day.label
            }}</span>
          </label>
        </div>
      </div>

      <DialogFooter class="border-t px-6 py-3 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="isSaving"
          @click="closeDialog"
        >
          Batal
        </Button>
        <Button
          size="sm"
          :disabled="isSaving"
          @click="handleSave"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
