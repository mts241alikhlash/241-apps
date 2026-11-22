<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { examRoomService } from '../services/examRoomService'
import type { RoomReport } from '../types'

const props = defineProps<{
  roomId: string
  slotId: string
  canAdd: boolean
  refreshKey: number
}>()

defineEmits<{ add: [] }>()

const clock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

const notes = ref<RoomReport['fieldNotes']>([])

async function loadNotes() {
  if (props.roomId === '' || props.slotId === '') return
  const result = await examRoomService.loadReport(props.roomId, props.slotId)
  if (result.success) notes.value = result.data.fieldNotes
}

watch(() => [props.roomId, props.slotId, props.refreshKey], loadNotes, {
  immediate: true,
})
</script>

<template>
  <Card gap="none">
    <CardHeader standard>
      <CardTitle size="md">Catatan Ruang</CardTitle>
      <Button
        v-if="canAdd"
        variant="outline"
        @click="$emit('add')"
      >
        Catat
      </Button>
    </CardHeader>
    <CardContent variant="standard">
      <p
        v-if="notes.length === 0"
        class="text-control text-muted-foreground"
      >
        Belum ada catatan.
      </p>
      <ul
        v-else
        class="space-y-2 text-control"
      >
        <li
          v-for="note in notes"
          :key="note.id"
        >
          <span class="text-muted-foreground">
            {{ clock.format(new Date(note.recordedAt)) }}
          </span>
          {{ note.studentName }}: {{ note.note }}
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
