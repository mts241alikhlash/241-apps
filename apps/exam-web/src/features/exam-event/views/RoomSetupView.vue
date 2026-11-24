<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import {
  DataTable,
  FormattedNumberInput,
  DataTableEmpty,
} from '@mts241alikhlash/ui'
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
import { Plus } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import EventWorkspacePage from '../components/EventWorkspacePage.vue'
import RoomAccessCodeDialog from '../components/RoomAccessCodeDialog.vue'
import RoomFormDialog from '../components/RoomFormDialog.vue'
import { buildRoomColumns } from '../components/roomColumns'
import { useEventWorkspace } from '../composables/useEventWorkspace'
import { examEventService } from '../services/examEventService'
import type { ExamRoom, UserOption } from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()
const workspace = useEventWorkspace()
const {
  events,
  event,
  visibleRooms,
  loading,
  loadFailed,
  canManage,
  canSupervise,
  canActOnRoom,
  load,
  select,
} = workspace

const technicians = ref<UserOption[]>([])
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

const technicianName = (userId: string | null) =>
  technicians.value.find((person) => person.id === userId)?.identifier ??
  'Belum ditugaskan'

const columns = computed(() =>
  buildRoomColumns({
    canManage: canManage.value,
    canSupervise: canSupervise.value || hasPermission('exam-rooms.read-all'),
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
  { title: 'Ujian', href: '#' },
  { title: 'Persiapan', href: '#' },
  { title: 'Ruangan', href: '/exam/room-setup' },
  ...(event.value ? [{ title: event.value.name }] : []),
])

onMounted(async () => {
  technicians.value = await examEventService.loadStaff(
    'EXAM_TECHNICIAN',
    !hasPermission('users.read'),
  )
})
</script>

<template>
  <EventWorkspacePage
    :title="event?.name ?? 'Ruangan'"
    back-label="Kembali ke Ruangan"
    hide-event-meta
    :events="events"
    :event="event"
    :loading="loading"
    :load-failed="loadFailed"
    @select="select"
    @retry="load()"
    @back="router.push('/exam/room-setup')"
  >
    <template #actions>
      <Button
        v-if="canManage && event"
        @click="openCreateRoom"
      >
        <Plus class="size-4" />
        Tambah
      </Button>
    </template>

    <DataTable
      mobile="cards"
      hide-pagination
      :columns="columns"
      :data="visibleRooms"
      :is-loading="loading"
      item-label="ruangan"
    >
      <template #empty>
        <DataTableEmpty message="Belum ada ruangan pada periode ini." />
      </template>
    </DataTable>

    <RoomFormDialog
      v-if="roomOpen && event"
      v-model:open="roomOpen"
      :event-id="event.id"
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
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control"
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
        <DialogFooter standard>
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
  </EventWorkspacePage>
</template>
