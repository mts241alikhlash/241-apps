<script setup lang="ts">
import { useId } from 'vue'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import { ALL_ROOMS } from '../composables/usePrintPack'

defineProps<{
  events: { id: string; name: string }[]
  eventId: string
  rooms: { id: string; label: string }[]
  roomId: string
  showRoomFilter: boolean
}>()

const emit = defineEmits<{
  'update:eventId': [value: string]
  'update:roomId': [value: string]
}>()

const eventFieldId = useId()
const roomFieldId = useId()

const asText = (value: AcceptableValue) =>
  typeof value === 'string' ? value : ''
</script>

<template>
  <div class="flex flex-wrap items-end gap-2">
    <FloatingLabelField
      label="Periode Ujian"
      :for="eventFieldId"
      class="w-fit min-w-40"
      floating
    >
      <Select
        :model-value="eventId"
        @update:model-value="(value) => emit('update:eventId', asText(value))"
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
        @update:model-value="(value) => emit('update:roomId', asText(value))"
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
  </div>
</template>
