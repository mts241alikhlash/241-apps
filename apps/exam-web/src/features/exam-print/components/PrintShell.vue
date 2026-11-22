<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { Printer } from '@lucide/vue'
import PrintFilters from './PrintFilters.vue'
import { ALL_SCOPES } from '../composables/usePrintScope'
import type { PrintScopeOption } from '../composables/usePrintScope'

const props = defineProps<{
  title: string
  events: { id: string; name: string }[]
  eventId: string
  rooms: { id: string; label: string }[]
  roomId: string
  loading: boolean
  error: string | null
  warnings: string[]
  hasContent: boolean
  showRoomFilter: boolean
  showFilters: boolean
  scopes: PrintScopeOption[]
}>()

const emit = defineEmits<{
  'update:eventId': [value: string]
  'update:roomId': [value: string]
  print: [scope: string]
  retry: []
}>()

const asText = (value: AcceptableValue) =>
  typeof value === 'string' ? value : ''

const scopeFieldId = useId()
const targetFieldId = useId()

const CAKUPAN = {
  all: 'Semua dokumen',
  room: 'Per ruangan',
  class: 'Per kelas',
  grade: 'Per tingkat',
} as const

type Cakupan = keyof typeof CAKUPAN

const availableCakupan = computed(() =>
  (Object.keys(CAKUPAN) as Cakupan[]).filter(
    (key) => key === 'all' || props.scopes.some((scope) => scope.group === key),
  ),
)

const printOpen = ref(false)
const cakupan = ref<Cakupan>('all')
const target = ref('')

const roomScopes = computed(() =>
  props.scopes.filter((item) => item.group === 'room'),
)
const classScopes = computed(() =>
  props.scopes.filter((item) => item.group === 'class'),
)
const gradeScopes = computed(() =>
  props.scopes.filter((item) => item.group === 'grade'),
)

const targetScopes = computed(() => {
  if (cakupan.value === 'room') return roomScopes.value
  if (cakupan.value === 'class') return classScopes.value
  if (cakupan.value === 'grade') return gradeScopes.value
  return []
})

const targetLabel = computed(() =>
  cakupan.value === 'grade'
    ? 'Tingkat'
    : cakupan.value === 'room'
      ? 'Ruang'
      : 'Kelas',
)

const targetPlaceholder = computed(() =>
  cakupan.value === 'grade'
    ? 'Pilih tingkat'
    : cakupan.value === 'room'
      ? 'Pilih ruangan'
      : 'Pilih kelas',
)

const canConfirm = computed(
  () =>
    cakupan.value === 'all' ||
    targetScopes.value.some((scope) => scope.key === target.value),
)

function openPrint() {
  cakupan.value = 'all'
  target.value = ''
  printOpen.value = true
}

function changeCakupan(value: AcceptableValue) {
  const next = asText(value)
  if (
    next !== 'all' &&
    next !== 'room' &&
    next !== 'class' &&
    next !== 'grade'
  ) {
    return
  }
  cakupan.value = next
  target.value = ''
}

function confirmPrint() {
  if (!canConfirm.value) return
  printOpen.value = false
  emit('print', target.value === '' ? ALL_SCOPES : target.value)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">{{ title }}</CardTitle>
        <div class="flex shrink-0 items-center gap-2">
          <slot name="header-actions" />
          <Button
            :disabled="loading || !hasContent"
            @click="openPrint"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </div>
      </CardHeader>

      <CardContent
        class="print-stack flex min-h-0 flex-1 flex-col space-y-6 overflow-auto p-4"
      >
        <PrintFilters
          v-if="showFilters"
          class="print:hidden"
          :events="events"
          :event-id="eventId"
          :rooms="rooms"
          :room-id="roomId"
          :show-room-filter="showRoomFilter"
          @update:event-id="(value) => emit('update:eventId', value)"
          @update:room-id="(value) => emit('update:roomId', value)"
        />

        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive print:hidden"
          role="alert"
        >
          <p>{{ error }}</p>
          <Button
            class="mt-2"
            variant="outline"
            :disabled="loading"
            @click="emit('retry')"
          >
            Coba lagi
          </Button>
        </div>
        <p
          v-else-if="loading"
          class="text-muted-foreground"
        >
          Menyiapkan dokumen...
        </p>
        <p
          v-else-if="events.length === 0"
          class="text-muted-foreground"
        >
          Belum ada periode ujian.
        </p>
        <template v-else>
          <p
            v-for="warning in warnings"
            :key="warning"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive print:hidden"
            role="alert"
          >
            {{ warning }}
          </p>
          <slot />
        </template>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="printOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Cetak {{ title }}</DialogTitle>
          <DialogDescription>
            Pilih bagian dokumen yang dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Cakupan"
            :for="scopeFieldId"
            floating
          >
            <Select
              :model-value="cakupan"
              @update:model-value="changeCakupan"
            >
              <SelectTrigger
                :id="scopeFieldId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="key in availableCakupan"
                  :key="key"
                  :value="key"
                >
                  {{ CAKUPAN[key] }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            v-if="cakupan !== 'all'"
            :label="targetLabel"
            :for="targetFieldId"
            floating
          >
            <Select v-model="target">
              <SelectTrigger
                :id="targetFieldId"
                class="w-full"
              >
                <SelectValue :placeholder="targetPlaceholder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="scope in targetScopes"
                  :key="scope.key"
                  :value="scope.key"
                >
                  {{ scope.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            @click="printOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="!canConfirm"
            @click="confirmPrint"
          >
            <Printer class="size-4" />
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
