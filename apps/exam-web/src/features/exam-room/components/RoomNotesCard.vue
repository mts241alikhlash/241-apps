<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { DataTable, DataTableEmpty } from '@mts241alikhlash/ui'
import { Plus } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { examRoomService } from '../services/examRoomService'
import type { RoomMonitorParticipant, RoomReport } from '../types'

const props = defineProps<{
  roomId: string
  slotId: string
  participants: RoomMonitorParticipant[]
  canAdd: boolean
  refreshKey: number
}>()

defineEmits<{ add: [] }>()

const clock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

type Note = RoomReport['fieldNotes'][number]

const notes = ref<RoomReport['fieldNotes']>([])
const loading = ref(false)

const numberOf = computed(
  () =>
    new Map(
      props.participants.map((row) => [row.studentId, row.participantNumber]),
    ),
)

const numberText = (note: Note): string =>
  numberOf.value.get(note.studentId) ?? '-'

const columns = computed<ColumnDef<Note>[]>(() => [
  {
    id: 'time',
    header: 'Jam',
    meta: {
      align: 'center',
      mobileLabel: 'Jam',
      mobileValue: (note: Note) => clock.format(new Date(note.recordedAt)),
    },
    cell: ({ row }) => clock.format(new Date(row.original.recordedAt)),
  },
  {
    id: 'number',
    header: 'No. Peserta',
    meta: {
      align: 'center',
      mobileLabel: 'No. Peserta',
      mobileValue: numberText,
    },
    cell: ({ row }) => numberText(row.original),
  },
  {
    id: 'student',
    header: 'Nama',
    meta: {
      align: 'left',
      strong: true,
      mobile: 'title',
      mobileValue: (note: Note) => note.studentName ?? '-',
    },
    cell: ({ row }) => row.original.studentName ?? '-',
  },
  {
    id: 'category',
    header: 'Kategori',
    meta: {
      align: 'center',
      mobileLabel: 'Kategori',
      mobileValue: (note: Note) => note.category,
    },
    cell: ({ row }) => row.original.category,
  },
  {
    id: 'note',
    header: 'Catatan',
    meta: {
      align: 'left',
      mobileLabel: 'Catatan',
      mobileValue: (note: Note) => note.note,
    },
    cell: ({ row }) => row.original.note,
  },
])

async function loadNotes() {
  if (props.roomId === '' || props.slotId === '') return
  loading.value = true
  const result = await examRoomService.loadReport(props.roomId, props.slotId)
  loading.value = false
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
        @click="$emit('add')"
      >
        <Plus class="size-4" />
        Tambah
      </Button>
    </CardHeader>
    <CardContent variant="standard">
      <DataTable
        mobile="cards"
        :columns="columns"
        :data="notes"
        :page-size="100"
        :total-items="notes.length"
        :is-loading="loading"
        hide-pagination
        hide-per-page
        item-label="catatan"
      >
        <template #empty>
          <DataTableEmpty message="Belum ada catatan." />
        </template>
      </DataTable>
    </CardContent>
  </Card>
</template>
