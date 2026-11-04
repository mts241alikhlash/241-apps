<script setup lang="ts">
import { onMounted, useId } from 'vue'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
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
import { typeLabel } from '@/features/exam-bank/types'
import { useTakeQuestions } from '../composables/useTakeQuestions'

const props = defineProps<{
  open: boolean
  packageId: string
  subjectId: string
  gradeId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  taken: []
}>()

const take = useTakeQuestions({
  packageId: props.packageId,
  subjectId: props.subjectId,
  gradeId: props.gradeId,
})
const fieldId = useId()

onMounted(() => take.load())

async function copy() {
  if (await take.submit()) {
    emit('taken')
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>Ambil Soal dari Paket Lain</DialogTitle>
        <DialogDescription class="sr-only">
          Pilih paket yang sudah disetujui, lalu salin soalnya ke paket ini.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="flex min-h-0 flex-col gap-4">
        <div
          v-if="take.error.value"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ take.error.value }}
        </div>
        <p
          v-if="!take.loading.value && take.sources.value.length === 0"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Belum ada paket lain yang disetujui untuk mapel dan tingkat ini.
        </p>
        <FloatingLabelField
          v-else
          label="Paket asal"
          :for="`${fieldId}-source`"
          floating
        >
          <Select v-model="take.sourceId.value">
            <SelectTrigger
              :id="`${fieldId}-source`"
              class="w-full"
            >
              <SelectValue placeholder="Pilih paket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="source in take.sources.value"
                :key="source.id"
                :value="source.id"
              >
                {{ source.title }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <template v-if="take.questions.value.length > 0">
          <div class="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              @click="take.selectAll()"
            >
              Pilih semua
            </Button>
            <Button
              type="button"
              variant="outline"
              @click="take.clear()"
            >
              Kosongkan
            </Button>
            <span
              class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
            >
              {{ take.selected.value.size }} dari
              {{ take.questions.value.length }} soal dipilih
            </span>
          </div>
          <ul class="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border">
            <li
              v-for="item in take.questions.value"
              :key="item.questionId"
              class="flex items-start gap-3 p-3 text-[length:var(--text-control,0.75rem)]"
            >
              <Checkbox
                :model-value="take.selected.value.has(item.questionId)"
                :aria-label="`Pilih soal ${item.position}`"
                @update:model-value="take.toggle(item.questionId)"
              />
              <span class="w-6 shrink-0 text-muted-foreground">
                {{ item.position }}
              </span>
              <span class="min-w-0 flex-1">{{ item.summary || '-' }}</span>
              <Badge variant="outline">{{ typeLabel(item.type) }}</Badge>
              <span class="w-12 shrink-0 text-right"
                >{{ item.points }} poin</span
              >
            </li>
          </ul>
        </template>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="take.selected.value.size === 0 || take.saving.value"
          @click="copy"
        >
          {{
            take.selected.value.size > 0
              ? `Salin soal (${take.selected.value.size})`
              : 'Salin soal'
          }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
