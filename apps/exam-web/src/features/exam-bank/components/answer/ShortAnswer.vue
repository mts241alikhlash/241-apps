<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Switch } from '@mts241alikhlash/ui/switch'
import type { ShortAnswerContent } from '../../types'

const content = defineModel<ShortAnswerContent>({ required: true })

function update(patch: Partial<ShortAnswerContent['answer']>) {
  content.value = { answer: { ...content.value.answer, ...patch } }
}

function setAccepted(index: number, text: string) {
  update({
    accepted: content.value.answer.accepted.map((answer, at) =>
      at === index ? text : answer,
    ),
  })
}

function addAccepted() {
  update({ accepted: [...content.value.answer.accepted, ''] })
}

function removeAccepted(index: number) {
  if (content.value.answer.accepted.length <= 1) return
  update({
    accepted: content.value.answer.accepted.filter((_, at) => at !== index),
  })
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-[length:var(--text-control,0.75rem)] text-muted-foreground">
      Tulis semua jawaban yang dianggap benar. Siswa benar bila jawabannya sama
      dengan salah satunya.
    </p>
    <div
      v-for="(answer, index) in content.answer.accepted"
      :key="index"
      class="flex items-center gap-2"
      data-testid="accepted-row"
    >
      <Input
        :model-value="answer"
        :aria-label="`Jawaban benar ${index + 1}`"
        dir="auto"
        @update:model-value="setAccepted(index, String($event ?? ''))"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        :disabled="content.answer.accepted.length <= 1"
        :aria-label="`Hapus jawaban benar ${index + 1}`"
        @click="removeAccepted(index)"
      >
        <Trash2 />
      </Button>
    </div>
    <Button
      type="button"
      variant="outline"
      @click="addAccepted"
    >
      <Plus class="mr-1.5 size-4" />
      Tambah jawaban benar
    </Button>
    <label class="flex items-center gap-2">
      <Switch
        :model-value="content.answer.ignoreCase"
        aria-label="Abaikan huruf besar dan kecil"
        @update:model-value="update({ ignoreCase: $event })"
      />
      Abaikan huruf besar dan kecil
    </label>
    <label class="flex items-center gap-2">
      <Switch
        :model-value="content.answer.ignoreHarakat"
        aria-label="Abaikan harakat"
        @update:model-value="update({ ignoreHarakat: $event })"
      />
      Abaikan harakat
    </label>
  </div>
</template>
