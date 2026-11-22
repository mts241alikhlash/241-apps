<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DataTable, SearchInput, DataTableEmpty } from '@mts241alikhlash/ui'
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
import ExamCard from '@/features/exam-room/components/ExamCard.vue'
import ExamSeatCard from '@/features/exam-room/components/ExamSeatCard.vue'
import PrintFilters from '../components/PrintFilters.vue'
import {
  buildPrintParticipantColumns,
  type PrintParticipantRow,
} from '../components/printParticipantColumns'
import type { PrintPack, PrintPackRoom } from '../types'

const props = defineProps<{
  kind: 'card' | 'seat'
  event: PrintPack['event']
  rooms: PrintPackRoom[]
  events: { id: string; name: string }[]
  eventId: string
  roomId: string
  roomOptions: { id: string; label: string }[]
  showRoomFilter: boolean
}>()

const emit = defineEmits<{
  printOne: [studentId: string]
  'update:eventId': [value: string]
  'update:roomId': [value: string]
}>()

defineOptions({ inheritAttrs: false })

const PER_PAGE = 8

const printedSheets = computed(() =>
  props.rooms.flatMap((room) => {
    const sheets: (typeof room.students)[] = []
    for (let i = 0; i < room.students.length; i += PER_PAGE) {
      sheets.push(room.students.slice(i, i + PER_PAGE))
    }
    return sheets.map((students, index) => ({
      key: `${room.id}-${index}`,
      room,
      students,
    }))
  }),
)

const search = ref('')
const page = ref(1)
const pageSize = ref(25)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
const preview = ref<PrintParticipantRow | null>(null)
const previewOpen = ref(false)

const unit = computed(() => (props.kind === 'card' ? 'peserta' : 'meja'))

const rows = computed<PrintParticipantRow[]>(() =>
  props.rooms.flatMap((room) =>
    room.students.map((student) => ({
      studentId: student.studentId,
      seatNumber: student.seatNumber,
      name: student.name,
      classroomName: student.classroomName,
      nis: student.nis,
      participantNumber: student.participantNumber,
      roomCode: room.code,
      roomName: room.name,
      password: student.credential?.password ?? null,
    })),
  ),
)

const filtered = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (keyword === '') return rows.value
  return rows.value.filter((row) =>
    [
      row.name ?? '',
      row.classroomName ?? '',
      row.participantNumber ?? '',
      row.roomCode,
      row.roomName,
    ].some((value) => value.toLocaleLowerCase('id').includes(keyword)),
  )
})

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const columns = computed(() =>
  buildPrintParticipantColumns({
    kind: props.kind,
    onPreview: (row) => {
      preview.value = row
      previewOpen.value = true
    },
  }),
)

const cardProps = computed(() =>
  preview.value === null
    ? null
    : {
        name: preview.value.name ?? 'Siswa tidak ditemukan',
        className: preview.value.classroomName,
        nis: preview.value.nis,
        participantNumber: preview.value.participantNumber,
        roomCode: preview.value.roomCode,
        password: preview.value.password,
      },
)

const seatProps = computed(() =>
  preview.value === null
    ? null
    : {
        seatNumber: preview.value.seatNumber,
        participantNumber: preview.value.participantNumber,
        name: preview.value.name ?? 'Siswa tidak ditemukan',
        className: preview.value.classroomName,
        roomCode: preview.value.roomCode,
      },
)

watch(search, () => {
  page.value = 1
})

watch(filtered, () => {
  const lastPage = Math.max(
    1,
    Math.ceil(filtered.value.length / pageSize.value),
  )
  if (page.value > lastPage) page.value = lastPage
})

function printOne() {
  if (preview.value === null) return
  const studentId = preview.value.studentId
  previewOpen.value = false
  emit('printOne', studentId)
}
</script>

<template>
  <div class="print-body space-y-4">
    <DataTable
      class="print:hidden"
      mobile="cards"
      :columns="columns"
      :data="paginated"
      :page="page"
      :page-size="pageSize"
      :total-items="filtered.length"
      :item-label="unit"
      @update:page="page = $event"
      @update:page-size="changePageSize"
    >
      <template #filters>
        <PrintFilters
          :events="events"
          :event-id="eventId"
          :rooms="roomOptions"
          :room-id="roomId"
          :show-room-filter="showRoomFilter"
          @update:event-id="(value) => emit('update:eventId', value)"
          @update:room-id="(value) => emit('update:roomId', value)"
        />
      </template>
      <template #header-right>
        <SearchInput
          v-model="search"
          class="sm:w-48"
          label="Cari peserta"
        />
      </template>
      <template #mobile-toolbar>
        <SearchInput
          v-model="search"
          label="Cari peserta"
          class="w-full"
        />
      </template>
      <template #empty>
        <DataTableEmpty
          :message="
            search
              ? 'Tidak ada peserta yang cocok dengan pencarian.'
              : `Belum ada ${unit} pada periode ini.`
          "
        />
      </template>
    </DataTable>

    <div class="print-only">
      <section
        v-for="sheet in printedSheets"
        :key="sheet.key"
        class="print-room"
      >
        <div class="print-sheet card-sheet">
          <template v-if="kind === 'card'">
            <ExamCard
              v-for="student in sheet.students"
              :key="student.studentId"
              :name="student.name ?? 'Siswa tidak ditemukan'"
              :class-name="student.classroomName"
              :nis="student.nis"
              :participant-number="student.participantNumber"
              :room-code="sheet.room.code"
              :password="student.credential?.password ?? null"
            />
          </template>
          <template v-else>
            <ExamSeatCard
              v-for="student in sheet.students"
              :key="`seat-${student.studentId}`"
              :seat-number="student.seatNumber"
              :participant-number="student.participantNumber"
              :name="student.name ?? 'Siswa tidak ditemukan'"
              :class-name="student.classroomName"
              :room-code="sheet.room.code"
            />
          </template>
        </div>
      </section>
    </div>

    <Dialog v-model:open="previewOpen">
      <DialogContent size="xl">
        <DialogHeader standard>
          <DialogTitle>
            Pratinjau {{ kind === 'card' ? 'Kartu Peserta' : 'Nomor Meja' }}
          </DialogTitle>
          <DialogDescription>
            Satu {{ kind === 'card' ? 'kartu peserta' : 'nomor meja' }} sebelum
            dicetak.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <div class="print-sheet card-sheet mx-auto max-w-md">
            <ExamCard
              v-if="kind === 'card' && cardProps"
              v-bind="cardProps"
            />
            <ExamSeatCard
              v-else-if="seatProps"
              v-bind="seatProps"
            />
          </div>
        </DialogBody>
        <DialogFooter standard>
          <Button @click="printOne">
            Cetak {{ kind === 'card' ? 'kartu ini' : 'nomor ini' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
