<script setup lang="ts">
import { useId } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
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
import { ALL_ROOMS } from '../composables/usePrintPack'

defineProps<{
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
}>()

const emit = defineEmits<{
  'update:eventId': [value: string]
  'update:roomId': [value: string]
  print: []
  retry: []
}>()

const eventFieldId = useId()
const roomFieldId = useId()

const asText = (value: AcceptableValue) =>
  typeof value === 'string' ? value : ''
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader variant="muted">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <CardTitle class="font-semibold">{{ title }}</CardTitle>
          <div class="flex flex-wrap items-end gap-2">
            <FloatingLabelField
              label="Periode Ujian"
              :for="eventFieldId"
              class="w-fit min-w-40"
              floating
            >
              <Select
                :model-value="eventId"
                @update:model-value="
                  (value) => emit('update:eventId', asText(value))
                "
              >
                <SelectTrigger
                  :id="eventFieldId"
                  class="w-full"
                >
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="event in events"
                    :key="event.id"
                    :value="event.id"
                  >
                    {{ event.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
            <FloatingLabelField
              v-if="showRoomFilter"
              label="Ruang"
              :for="roomFieldId"
              class="w-fit min-w-40"
              floating
            >
              <Select
                :model-value="roomId"
                @update:model-value="
                  (value) => emit('update:roomId', asText(value))
                "
              >
                <SelectTrigger
                  :id="roomFieldId"
                  class="w-full"
                >
                  <SelectValue placeholder="Semua ruang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="ALL_ROOMS">Semua ruang</SelectItem>
                  <SelectItem
                    v-for="room in rooms"
                    :key="room.id"
                    :value="room.id"
                  >
                    {{ room.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
            <Button
              :disabled="loading || !hasContent"
              @click="emit('print')"
            >
              <Printer class="size-4" />
              Cetak A4
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        class="print-stack flex min-h-0 flex-1 flex-col space-y-6 overflow-auto p-4 sm:p-6"
      >
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
        <p
          v-else-if="!hasContent"
          class="text-muted-foreground"
        >
          Periode ini belum memiliki data untuk dokumen ini.
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
    </Card>
  </div>
</template>
