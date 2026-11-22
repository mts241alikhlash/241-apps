<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import { Check, X } from '@lucide/vue'
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
import { Input } from '@mts241alikhlash/ui/input'
import QuestionHtml from '@/features/exam-bank/components/QuestionHtml.vue'
import { examGradingService } from '../services/examGradingService'
import type { GradingItem } from '../types'
import { answerText, booleanLabel, chosenKeys } from '../types'

const props = defineProps<{
  open: boolean
  sessionId: string
  item: GradingItem | null
  canGrade: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  graded: [item: GradingItem]
}>()

const points = computed(() => props.item?.points ?? 0)

const formSchema = toTypedSchema(
  z
    .object({
      score: z
        .number({
          required_error: 'Poin wajib diisi',
          invalid_type_error: 'Poin wajib diisi',
        })
        .int('Poin harus bilangan bulat')
        .min(0, 'Poin minimal 0'),
      note: z.string().max(500, 'Catatan maksimal 500 karakter'),
    })
    .superRefine((value, ctx) => {
      if (value.score > points.value) {
        ctx.addIssue({
          code: 'custom',
          path: ['score'],
          message: `Poin maksimal ${points.value}`,
        })
      }
    }),
)

const { handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: formSchema,
  initialValues: {
    score: props.item?.score ?? undefined,
    note: props.item?.note ?? '',
  },
})

const saveError = ref<string | null>(null)

watch(
  () => [props.item?.questionId, props.open] as const,
  () => {
    saveError.value = null
    resetForm({
      values: {
        score: props.item?.score ?? undefined,
        note: props.item?.note ?? '',
      },
    })
  },
)

const answer = computed(() => answerText(props.item?.answer ?? null))
const chosen = computed(() => new Set(chosenKeys(props.item?.answer ?? null)))
const correct = computed(() => new Set(props.item?.correctKeys ?? []))

const hasAnswer = computed(() => {
  const value = props.item?.answer ?? null
  return value !== null && (!('text' in value) || answer.value.trim() !== '')
})

const options = computed(() => {
  const item = props.item
  if (item === null) return []
  if (item.choices) {
    return item.choices.map((choice) => ({
      key: choice.key,
      label: `${choice.key}.`,
      html: choice.html,
      text: '',
      correct: correct.value.has(choice.key),
      chosen: chosen.value.has(choice.key),
    }))
  }
  if (item.type === 'TRUE_FALSE') {
    return [true, false].map((value) => ({
      key: String(value),
      label: '',
      html: null as string | null,
      text: booleanLabel(value),
      correct: item.correctValue === value,
      chosen: item.answer?.value === value,
    }))
  }
  return []
})

const gradable = computed(
  () => props.item?.manual === true && props.canGrade && hasAnswer.value,
)

const onSubmit = handleSubmit(async (form) => {
  const item = props.item
  if (item === null) return
  saveError.value = null
  const graded = await examGradingService.grade(
    props.sessionId,
    item.questionId,
    {
      score: form.score,
      note: form.note.trim() || undefined,
    },
  )
  if (!graded) {
    saveError.value = 'Nilai gagal disimpan.'
    return
  }
  toast.success('Nilai disimpan.')
  emit('graded', graded)
  emit('update:open', false)
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>
          {{ item ? `Soal ${item.number}` : 'Detail Soal' }}
        </DialogTitle>
        <DialogDescription>
          Soal lengkap, jawaban siswa, dan penilaian.
        </DialogDescription>
      </DialogHeader>
      <DialogBody
        v-if="item"
        class="space-y-3"
      >
        <Alert
          v-if="saveError"
          variant="destructive"
        >
          <AlertDescription>{{ saveError }}</AlertDescription>
        </Alert>

        <QuestionHtml
          class="[&>p:first-child]:!mt-0 [&>p:last-child]:!mb-0"
          :html="item.bodyHtml"
        />

        <ul
          v-if="options.length > 0"
          class="space-y-0.5 rounded-md border p-1 text-control"
        >
          <li
            v-for="option in options"
            :key="option.key"
            :class="[
              'flex items-start gap-2 rounded px-2 py-1',
              option.correct && 'bg-success/10 text-success',
              option.chosen &&
                !option.correct &&
                'bg-destructive/10 text-destructive',
            ]"
          >
            <span
              v-if="option.label"
              class="w-4 shrink-0"
            >
              {{ option.label }}
            </span>
            <QuestionHtml
              v-if="option.html !== null"
              class="min-w-0 flex-1 [&_p]:!my-0"
              :html="option.html"
            />
            <span
              v-else
              class="min-w-0 flex-1"
            >
              {{ option.text }}
            </span>
            <Check
              v-if="option.correct"
              class="mt-0.5 size-3.5 shrink-0"
              aria-label="Jawaban benar"
            />
            <X
              v-else-if="option.chosen"
              class="mt-0.5 size-3.5 shrink-0"
              aria-label="Jawaban siswa salah"
            />
          </li>
        </ul>
        <p
          v-if="options.length > 0 && !hasAnswer"
          class="text-muted-foreground"
        >
          Tidak dijawab.
        </p>
        <dl
          v-if="
            options.length === 0 ||
            item.guideHtml ||
            (item.acceptedAnswers && item.acceptedAnswers.length > 0)
          "
          class="grid grid-cols-[max-content_auto_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-control"
        >
          <template v-if="item.guideHtml">
            <dt class="text-muted-foreground">Pedoman</dt>
            <span
              class="text-muted-foreground"
              aria-hidden="true"
              >:</span
            >
            <dd>
              <QuestionHtml
                class="[&_p]:!my-0"
                :html="item.guideHtml"
              />
            </dd>
          </template>
          <template
            v-if="item.acceptedAnswers && item.acceptedAnswers.length > 0"
          >
            <dt class="text-muted-foreground">Kunci jawaban</dt>
            <span
              class="text-muted-foreground"
              aria-hidden="true"
              >:</span
            >
            <dd>{{ item.acceptedAnswers.join(', ') }}</dd>
          </template>
          <template v-if="options.length === 0">
            <dt class="text-muted-foreground">Jawaban siswa</dt>
            <span
              class="text-muted-foreground"
              aria-hidden="true"
              >:</span
            >
            <dd
              :class="[
                'whitespace-pre-wrap',
                !hasAnswer && 'text-muted-foreground',
              ]"
              dir="auto"
            >
              {{ hasAnswer ? answer : 'Tidak dijawab.' }}
            </dd>
          </template>
        </dl>

        <form
          v-if="gradable"
          id="grade-item-form"
          class="grid gap-3 sm:grid-cols-[8rem_1fr]"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="score"
            label="Poin"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  :model-value="value === undefined ? '' : String(value)"
                  type="text"
                  inputmode="numeric"
                  :maxlength="String(Math.ceil(item.points)).length"
                  @update:model-value="
                    (next) =>
                      handleChange(
                        String(next).replace(/\D/g, '') === ''
                          ? undefined
                          : Number(String(next).replace(/\D/g, '')),
                      )
                  "
                />
              </FormControl>
            </div>
          </FloatingField>
          <FloatingField
            v-slot="{ componentField }"
            name="note"
            label="Catatan"
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="500"
                />
              </FormControl>
            </div>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter
        v-if="gradable"
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
          type="submit"
          form="grade-item-form"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
