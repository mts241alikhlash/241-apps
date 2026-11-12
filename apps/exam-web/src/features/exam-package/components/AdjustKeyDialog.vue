<script setup lang="ts">
import { computed, ref, useId } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import type { ExamPackageItemView } from '../types'
import { RESOLUTIONS, resolutionLabel } from '../types'
import { examPackageService } from '../services/examPackageService'

const props = defineProps<{
  open: boolean
  packageId: string
  item: ExamPackageItemView
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  adjusted: [rescoredSessions: number]
}>()

const resolution = ref<'NORMAL' | 'BONUS_ALL' | 'KEY_OVERRIDE'>('BONUS_ALL')
const answerKey = ref('')
const answerKeys = ref('')
const answerValue = ref<'true' | 'false'>('true')
const acceptedText = ref('')
const essayGuide = ref('')
const reason = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const fieldId = useId()

const overrideContent = computed<Record<string, unknown>>(() => {
  switch (props.item.type) {
    case 'TRUE_FALSE':
      return { answer: { value: answerValue.value === 'true' } }
    case 'MULTIPLE_RESPONSE':
      return {
        answer: {
          keys: answerKeys.value
            .split(',')
            .map((key) => key.trim().toUpperCase())
            .filter((key) => key.length > 0),
        },
      }
    case 'MULTIPLE_CHOICE':
      return { answer: { key: answerKey.value.trim().toUpperCase() } }
    case 'SHORT_ANSWER':
      return {
        answer: {
          accepted: acceptedText.value
            .split(',')
            .map((text) => text.trim())
            .filter((text) => text.length > 0),
        },
      }
    default:
      return { guideHtml: essayGuide.value.trim() || null }
  }
})

const problem = computed<string | null>(() => {
  if (reason.value.trim().length < 5) return 'Alasan minimal 5 karakter'
  if (resolution.value !== 'KEY_OVERRIDE') return null
  switch (props.item.type) {
    case 'TRUE_FALSE':
      return null
    case 'MULTIPLE_RESPONSE':
      return answerKeys.value.trim() ? null : 'Kunci pengganti wajib diisi'
    case 'MULTIPLE_CHOICE':
      return answerKey.value.trim() ? null : 'Kunci pengganti wajib diisi'
    case 'SHORT_ANSWER':
      return acceptedText.value.trim() ? null : 'Jawaban diterima wajib diisi'
    default:
      return null
  }
})

async function submit() {
  if (problem.value !== null || saving.value) return
  saving.value = true
  error.value = null
  const result = await examPackageService.adjustItemKey(
    props.packageId,
    props.item.questionId,
    {
      resolution: resolution.value,
      overrideContent:
        resolution.value === 'KEY_OVERRIDE' ? overrideContent.value : undefined,
      reason: reason.value.trim(),
    },
  )
  saving.value = false
  if (!result.success) {
    error.value = result.error
    return
  }
  emit('adjusted', result.data.rescoredSessions)
  emit('update:open', false)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>Ralat Kunci / Bonus Soal</DialogTitle>
        <DialogDescription>
          Soal {{ item.position }} · {{ item.summary || 'tanpa ringkasan' }}
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ error }}
        </div>

        <FloatingLabelField
          label="Perlakuan"
          :for="`${fieldId}-resolution`"
          floating
        >
          <Select v-model="resolution">
            <SelectTrigger
              :id="`${fieldId}-resolution`"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in RESOLUTIONS"
                :key="option"
                :value="option"
              >
                {{ resolutionLabel(option) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <template v-if="resolution === 'KEY_OVERRIDE'">
          <FloatingLabelField
            v-if="item.type === 'TRUE_FALSE'"
            label="Kunci pengganti"
            :for="`${fieldId}-bool`"
            floating
          >
            <Select v-model="answerValue">
              <SelectTrigger
                :id="`${fieldId}-bool`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Benar</SelectItem>
                <SelectItem value="false">Salah</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            v-else-if="item.type === 'MULTIPLE_CHOICE'"
            label="Kunci pengganti"
            :for="`${fieldId}-key`"
            floating
          >
            <Input
              :id="`${fieldId}-key`"
              v-model="answerKey"
              maxlength="1"
            />
          </FloatingLabelField>
          <FloatingLabelField
            v-else-if="item.type === 'MULTIPLE_RESPONSE'"
            label="Kunci pengganti (pisahkan dengan koma)"
            :for="`${fieldId}-keys`"
            floating
          >
            <Input
              :id="`${fieldId}-keys`"
              v-model="answerKeys"
            />
          </FloatingLabelField>
          <FloatingLabelField
            v-else-if="item.type === 'SHORT_ANSWER'"
            label="Jawaban diterima (pisahkan dengan koma)"
            :for="`${fieldId}-accepted`"
            floating
          >
            <Input
              :id="`${fieldId}-accepted`"
              v-model="acceptedText"
            />
          </FloatingLabelField>
          <FloatingLabelField
            v-else
            label="Panduan penilaian"
            :for="`${fieldId}-guide`"
            floating
          >
            <Textarea
              :id="`${fieldId}-guide`"
              v-model="essayGuide"
              rows="3"
            />
          </FloatingLabelField>
        </template>

        <FloatingLabelField
          label="Alasan"
          :for="`${fieldId}-reason`"
          floating
        >
          <Textarea
            :id="`${fieldId}-reason`"
            v-model="reason"
            maxlength="300"
            rows="3"
          />
        </FloatingLabelField>

        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Sesi yang sudah selesai dihitung ulang dan nilainya dikirim ulang.
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          :disabled="problem !== null || saving"
          @click="submit"
        >
          Simpan Ralat
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
