<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BackButton,
  DataTable,
  FormattedNumberInput,
} from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
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
import { Textarea } from '@mts241alikhlash/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { Plus } from '@lucide/vue'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@/features/platform/auth'
import { examTypeLabel } from '@/features/exam-schedule/types'
import { formatWindow } from '@/features/exam-schedule/utils/formatWindow'
import ExamCardPanel from '../components/ExamCardPanel.vue'
import RoomAccessCodeDialog from '../components/RoomAccessCodeDialog.vue'
import RoomFormDialog from '../components/RoomFormDialog.vue'
import SeatAssignmentPanel from '../components/SeatAssignmentPanel.vue'
import SupervisorSchedulePanel from '../components/SupervisorSchedulePanel.vue'
import { buildRoomColumns } from '../components/roomColumns'
import { examEventService } from '../services/examEventService'
import { eventStatusLabel, eventStatusVariant } from '../types'
import type { ExamEvent, ExamRoom, UserOption } from '../types'

const route = useRoute()
const router = useRouter()
const { hasPermission, user } = useAuthSession()

const id = computed(() => String(route.params.id ?? ''))
const event = ref<ExamEvent | null>(null)
const rooms = ref<ExamRoom[]>([])
const technicians = ref<UserOption[]>([])
const loading = ref(false)
const loadFailed = ref(false)
const tab = ref('rooms')

const roomOpen = ref(false)
const editingRoom = ref<ExamRoom | null>(null)
const tokenTarget = ref<ExamRoom | null>(null)
const tokenAction = ref<'read' | 'rotate'>('read')
const extendTarget = ref<ExamRoom | null>(null)
const extendMinutes = ref<number | null>(10)
const extendReason = ref('')
const extending = ref(false)
const extendError = ref<string | null>(null)
const fieldId = useId()

const canManage = computed(() => hasPermission('exam-events.manage'))
const canReadEvents = computed(() => hasPermission('exam-events.read'))
const supervisedRoomIds = ref<Set<string>>(new Set())
const canSupervise = computed(
  () =>
    hasPermission('exam-rooms.supervise') ||
    hasPermission('exam-rooms.manage-all'),
)
const canManageAll = computed(() => hasPermission('exam-rooms.manage-all'))
const canSubstitute = canManageAll
const userId = computed(() => user.value?.id ?? '')

const canActOnRoom = (room: ExamRoom) =>
  canManageAll.value ||
  (hasPermission('exam-rooms.technician') &&
    room.technicianUserId === userId.value)

const technicianName = (userId: string | null) =>
  technicians.value.find((person) => person.id === userId)?.identifier ??
  userId ??
  'Belum ditugaskan'

const columns = computed(() =>
  buildRoomColumns({
    canManage: canManage.value,
    canSupervise: canSupervise.value,
    technicianName,
    canActOnRoom,
    onEdit: (room) => {
      editingRoom.value = room
      roomOpen.value = true
    },
    onAccessCode: (room) => {
      tokenTarget.value = room
      tokenAction.value = 'read'
    },
    onRotateToken: (room) => {
      tokenTarget.value = room
      tokenAction.value = 'rotate'
    },
    onExtendTime: (room) => {
      extendTarget.value = room
      extendMinutes.value = 10
      extendReason.value = ''
      extendError.value = null
    },
  }),
)

function openCreateRoom() {
  editingRoom.value = null
  roomOpen.value = true
}

async function load() {
  loading.value = true
  const [detail, list] = await Promise.all([
    examEventService.loadEvent(id.value),
    examEventService.loadRooms(id.value),
  ])
  loading.value = false
  loadFailed.value = !detail.success
  event.value = detail.success ? detail.data : null
  rooms.value = list.success ? list.data : []
  if (!canReadEvents.value) await loadSupervisedRooms()
}

async function loadSupervisedRooms() {
  const found = new Set<string>()
  const now = Date.now()
  await Promise.all(
    rooms.value.map(async (room) => {
      const result = await examEventService.loadSupervisors(room.id)
      if (!result.success) return
      const onDuty = result.data.some(
        (slot) =>
          slot.actualUserId === userId.value &&
          new Date(slot.startsAt).getTime() <= now &&
          new Date(slot.endsAt).getTime() > now,
      )
      if (onDuty) found.add(room.id)
    }),
  )
  supervisedRoomIds.value = found
}

const visibleRooms = computed(() => {
  if (canReadEvents.value) return rooms.value
  return rooms.value.filter(
    (room) => supervisedRoomIds.value.has(room.id) || canActOnRoom(room),
  )
})

async function submitExtend() {
  const target = extendTarget.value
  const minutes = extendMinutes.value
  if (!target || minutes === null || extendReason.value.trim().length < 5) {
    return
  }
  extending.value = true
  const done = await examEventService.extendRoomTime(
    target.id,
    minutes,
    extendReason.value.trim(),
  )
  extending.value = false
  if (done) extendTarget.value = null
  else extendError.value = 'Gagal menambah waktu ruangan.'
}

useBreadcrumbs(() => [
  { title: 'Kegiatan Ujian', href: '/exam/events' },
  { title: event.value?.name ?? 'Kegiatan' },
])

onMounted(async () => {
  await load()
  if (hasPermission('users.read')) {
    technicians.value = await examEventService.loadStaff('EXAM_TECHNICIAN')
  }
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card gap="none">
      <CardHeader standard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <BackButton
              label="Kembali ke Kegiatan Ujian"
              @click="router.push('/exam/events')"
            />
            <CardTitle size="lg">
              {{ event?.name ?? 'Kegiatan Ujian' }}
            </CardTitle>
          </div>
          <Button
            v-if="canManage && event"
            @click="openCreateRoom"
          >
            <Plus class="mr-1.5 size-4" />
            Tambah Ruangan
          </Button>
        </div>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-4"
      >
        <div
          v-if="loadFailed"
          class="space-y-3"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            Kegiatan ujian tidak dapat dimuat.
          </p>
          <Button
            variant="outline"
            @click="load()"
          >
            Coba lagi
          </Button>
        </div>

        <template v-else-if="event">
          <div
            class="flex flex-wrap items-center gap-2 text-[length:var(--text-control,0.75rem)]"
          >
            <Badge :variant="eventStatusVariant(event.status)">
              {{ eventStatusLabel(event.status) }}
            </Badge>
            <Badge variant="outline">{{ examTypeLabel(event.type) }}</Badge>
            <span class="tabular-nums text-muted-foreground">
              {{ formatWindow(event.startsAt, event.endsAt) }}
            </span>
            <span class="tabular-nums text-muted-foreground">
              Toleransi {{ event.lateToleranceMinutes }} menit
            </span>
          </div>

          <Tabs
            v-model="tab"
            variant="line"
          >
            <TabsList>
              <TabsTrigger value="rooms">Ruangan &amp; Teknisi</TabsTrigger>
              <TabsTrigger value="seats">Pembagian Kursi Siswa</TabsTrigger>
              <TabsTrigger value="supervisors">Jadwal Pengawas</TabsTrigger>
              <TabsTrigger value="cards">Cetak Kartu &amp; Meja</TabsTrigger>
            </TabsList>

            <TabsContent value="rooms">
              <DataTable
                mobile="cards"
                hide-pagination
                :columns="columns"
                :data="visibleRooms"
                :is-loading="loading"
                item-label="ruangan"
              >
                <template #empty>
                  <p>Belum ada ruangan pada kegiatan ini.</p>
                </template>
              </DataTable>
            </TabsContent>

            <TabsContent value="seats">
              <SeatAssignmentPanel
                :rooms="visibleRooms"
                :semester-id="event.semesterId"
                :can-supervise="canSupervise"
                :can-assign="canManage"
                :can-act-on-room="canActOnRoom"
              />
            </TabsContent>

            <TabsContent value="supervisors">
              <SupervisorSchedulePanel
                :rooms="visibleRooms"
                :can-substitute="canSubstitute"
                :can-supervise="canSupervise"
              />
            </TabsContent>

            <TabsContent
              value="cards"
              force-mount
            >
              <ExamCardPanel
                :event="event"
                :rooms="visibleRooms"
                :semester-id="event.semesterId"
                :active="tab === 'cards'"
              />
            </TabsContent>
          </Tabs>
        </template>
      </CardContent>
    </Card>

    <RoomFormDialog
      v-if="roomOpen"
      v-model:open="roomOpen"
      :event-id="id"
      :room="editingRoom"
      @saved="load()"
    />

    <RoomAccessCodeDialog
      v-if="tokenTarget"
      :open="true"
      :room-id="tokenTarget.id"
      :room-name="`${tokenTarget.code} · ${tokenTarget.name}`"
      :action="tokenAction"
      :can-rotate="tokenTarget !== null && canActOnRoom(tokenTarget)"
      @update:open="(value: boolean) => !value && (tokenTarget = null)"
    />

    <Dialog
      :open="extendTarget !== null"
      @update:open="(value: boolean) => !value && (extendTarget = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Tambah Waktu Ruangan</DialogTitle>
          <DialogDescription>
            {{ extendTarget?.code }} · {{ extendTarget?.name }}
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <div
            v-if="extendError"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ extendError }}
          </div>
          <FloatingLabelField
            label="Tambahan menit"
            :for="`${fieldId}-minutes`"
            floating
          >
            <FormattedNumberInput
              :id="`${fieldId}-minutes`"
              v-model="extendMinutes"
              numeric
              suffix=" menit"
              :max-digits="3"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Alasan"
            :for="`${fieldId}-extend-reason`"
            floating
          >
            <Textarea
              :id="`${fieldId}-extend-reason`"
              v-model="extendReason"
              maxlength="300"
              rows="3"
            />
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="extendTarget = null"
          >
            Batal
          </Button>
          <Button
            :disabled="
              extending ||
              extendMinutes === null ||
              extendMinutes < 1 ||
              extendMinutes > 120 ||
              extendReason.trim().length < 5
            "
            @click="submitExtend"
          >
            Tambah Waktu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
