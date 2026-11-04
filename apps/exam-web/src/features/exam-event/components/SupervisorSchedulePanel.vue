<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DataTable } from '@mts241alikhlash/ui'
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
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { buildSupervisorColumns } from '../components/seatColumns'
import { examEventService } from '../services/examEventService'
import type { ExamRoom, SupervisorSlot, UserOption } from '../types'

const props = defineProps<{
  rooms: ExamRoom[]
  canSubstitute: boolean
  canSupervise: boolean
}>()

const roomId = ref('')
const slots = ref<SupervisorSlot[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const teachers = ref<UserOption[]>([])
const target = ref<SupervisorSlot | null>(null)
const actualUserId = ref('')
const reason = ref('')
const saving = ref(false)
const addOpen = ref(false)
const newUserId = ref('')
const newStartsAt = ref('')
const newEndsAt = ref('')
const addReason = ref('')
const adding = ref(false)
const addError = ref<string | null>(null)

const nameOf = (userId: string) =>
  teachers.value.find((person) => person.id === userId)?.identifier ?? userId

const columns = computed(() =>
  buildSupervisorColumns({
    canSubstitute: props.canSubstitute,
    userName: nameOf,
    onSubstitute: (slot) => {
      target.value = slot
      actualUserId.value = ''
      reason.value = ''
    },
  }),
)

async function load(nextRoomId = roomId.value) {
  roomId.value = nextRoomId
  if (!nextRoomId) {
    slots.value = []
    return
  }
  loading.value = true
  const result = await examEventService.loadSupervisors(nextRoomId)
  loading.value = false
  if (result.success) {
    slots.value = result.data
    error.value = null
  } else {
    slots.value = []
    error.value = result.error
  }
}

async function submitSubstitute() {
  const slot = target.value
  if (!slot || actualUserId.value === '' || reason.value.trim().length < 5) {
    return
  }
  saving.value = true
  const result = await examEventService.substituteSupervisor(
    roomId.value,
    slot.slotId,
    actualUserId.value,
    reason.value.trim(),
  )
  saving.value = false
  if (result.success) {
    target.value = null
    await load()
  } else {
    error.value = result.error
  }
}

function openAdd() {
  newUserId.value = ''
  newStartsAt.value = ''
  newEndsAt.value = ''
  addReason.value = ''
  addError.value = null
  addOpen.value = true
}

async function submitAdd() {
  if (
    roomId.value === '' ||
    newUserId.value === '' ||
    newStartsAt.value === '' ||
    newEndsAt.value === '' ||
    addReason.value.trim().length < 5
  ) {
    return
  }
  adding.value = true
  const result = await examEventService.assignSupervisor(roomId.value, {
    scheduledUserId: newUserId.value,
    startsAt: new Date(newStartsAt.value).toISOString(),
    endsAt: new Date(newEndsAt.value).toISOString(),
    reason: addReason.value.trim(),
  })
  adding.value = false
  if (result.success) {
    addOpen.value = false
    await load()
  } else {
    addError.value = result.error
  }
}

onMounted(async () => {
  teachers.value = await examEventService.loadStaff('TEACHER')
  const first = props.rooms[0]
  if (first && props.canSupervise) await load(first.id)
})
</script>

<template>
  <div class="space-y-4">
    <FloatingLabelField
      v-if="canSupervise"
      label="Ruangan"
      :for="'supervisor-room'"
      class="w-fit min-w-48"
      floating
    >
      <Select
        :model-value="roomId"
        @update:model-value="load(String($event))"
      >
        <SelectTrigger
          id="supervisor-room"
          class="w-full"
        >
          <SelectValue placeholder="Pilih ruangan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="room in rooms"
            :key="room.id"
            :value="room.id"
          >
            {{ room.code }} · {{ room.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </FloatingLabelField>
    <Button
      v-if="canSubstitute && roomId"
      class="shrink-0"
      @click="openAdd"
    >
      Tambah Pengawas
    </Button>

    <div
      v-if="error"
      class="space-y-3 rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
      role="alert"
    >
      <p>{{ error }}</p>
      <Button
        variant="outline"
        @click="load()"
      >
        Coba lagi
      </Button>
    </div>

    <DataTable
      v-else
      mobile="cards"
      hide-pagination
      :columns="columns"
      :data="slots"
      :is-loading="loading"
      item-label="slot pengawas"
    >
      <template #empty>
        <p>Belum ada jadwal pengawas untuk ruangan ini.</p>
      </template>
    </DataTable>

    <Dialog
      :open="target !== null"
      @update:open="(value: boolean) => !value && (target = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Ganti Pengawas</DialogTitle>
          <DialogDescription>
            Pengganti mendadak tercatat di Berita Acara bersama alasannya.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Pengganti"
            :for="'substitute-person'"
            floating
          >
            <Select v-model="actualUserId">
              <SelectTrigger
                id="substitute-person"
                class="w-full"
              >
                <SelectValue placeholder="Pilih pengganti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="person in teachers"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.identifier }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Alasan"
            :for="'substitute-reason'"
            floating
          >
            <Textarea
              id="substitute-reason"
              v-model="reason"
              maxlength="200"
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
            @click="target = null"
          >
            Batal
          </Button>
          <Button
            :disabled="
              saving || actualUserId === '' || reason.trim().length < 5
            "
            @click="submitSubstitute"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog
      :open="addOpen"
      @update:open="(value: boolean) => value || (addOpen = false)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Tambah Jadwal Pengawas</DialogTitle>
          <DialogDescription>
            Slot pengawas menentukan siapa yang boleh membuka ruangan.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <div
            v-if="addError"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ addError }}
          </div>
          <FloatingLabelField
            label="Pengawas"
            :for="'new-supervisor'"
            floating
          >
            <Select v-model="newUserId">
              <SelectTrigger
                id="new-supervisor"
                class="w-full"
              >
                <SelectValue placeholder="Pilih pengawas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="person in teachers"
                  :key="person.id"
                  :value="person.id"
                >
                  {{ person.identifier }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Mulai"
            :for="'new-supervisor-start'"
            floating
          >
            <Input
              id="new-supervisor-start"
              v-model="newStartsAt"
              type="datetime-local"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Selesai"
            :for="'new-supervisor-end'"
            floating
          >
            <Input
              id="new-supervisor-end"
              v-model="newEndsAt"
              type="datetime-local"
            />
          </FloatingLabelField>
          <FloatingLabelField
            label="Alasan"
            :for="'new-supervisor-reason'"
            floating
          >
            <Textarea
              id="new-supervisor-reason"
              v-model="addReason"
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
            @click="addOpen = false"
          >
            Batal
          </Button>
          <Button
            :disabled="
              adding ||
              newUserId === '' ||
              newStartsAt === '' ||
              newEndsAt === '' ||
              addReason.trim().length < 5
            "
            @click="submitAdd"
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
