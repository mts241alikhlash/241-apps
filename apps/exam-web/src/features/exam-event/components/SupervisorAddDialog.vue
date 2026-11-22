<script setup lang="ts">
import { ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
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
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { examEventService } from '../services/examEventService'
import type { UserOption } from '../types'

const props = defineProps<{
  open: boolean
  rooms: { id: string; name: string }[]
  people: UserOption[]
  startsAt: string
  endsAt: string
  schedule: string
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const ADD_REASON = 'Penambahan jadwal pengawas'

const formSchema = toTypedSchema(
  z.object({
    roomId: z.string().min(1, 'Pilih ruangan'),
    userId: z.string().min(1, 'Pilih pengawas'),
  }),
)

const initial = () => ({
  roomId: props.rooms[0]?.id ?? '',
  userId: '',
})

const { handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: initial(),
})

const saveError = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  saveError.value = null
  const result = await examEventService.assignSupervisor(values.roomId, {
    scheduledUserId: values.userId,
    startsAt: new Date(props.startsAt).toISOString(),
    endsAt: new Date(props.endsAt).toISOString(),
    reason: ADD_REASON,
  })
  if (!result.success) {
    saveError.value = result.error
    return
  }
  toast.success('Jadwal pengawas ditambahkan.')
  emit('saved')
  emit('update:open', false)
})

function close() {
  emit('update:open', false)
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetForm({ values: initial() })
    saveError.value = null
  },
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="md"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Tambah Jadwal Pengawas</DialogTitle>
        <DialogDescription>
          Slot pengawas menentukan siapa yang boleh membuka ruangan.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="saveError"
          variant="destructive"
          role="alert"
        >
          <AlertDescription>{{ saveError }}</AlertDescription>
        </Alert>

        <form
          id="supervisor-add-form"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <dl class="rounded-md border bg-muted/30 px-4 py-2">
            <div class="flex flex-col gap-0.5">
              <dt class="text-control text-muted-foreground">Jadwal</dt>
              <dd class="font-medium">{{ schedule }}</dd>
            </div>
          </dl>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="roomId"
            label="Ruangan"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="room in rooms"
                    :key="room.id"
                    :value="room.id"
                  >
                    {{ room.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="userId"
            label="Pengawas"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="person in people"
                    :key="person.id"
                    :value="person.id"
                  >
                    {{ person.identifier }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter standard>
        <Button
          type="button"
          variant="outline"
          @click="close"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="supervisor-add-form"
          :disabled="isSubmitting"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
