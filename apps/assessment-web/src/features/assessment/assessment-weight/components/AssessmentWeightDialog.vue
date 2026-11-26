<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { FormattedNumberInput } from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import { CheckCircle2, Loader2, RotateCcw } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useAssessmentWeights } from '../composables/useAssessmentWeights'
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_ORDER,
  ASSESSMENT_WEIGHT_TOTAL,
} from '../types'

const props = defineProps<{
  teachingAssignmentId: string | null
  subjectName?: string
  classroomCode?: string
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  saved: [teachingAssignmentId: string]
}>()

const {
  weights,
  loading,
  isSaving,
  total,
  isBalanced,
  remaining,
  fetch,
  save,
  applyDefault,
} = useAssessmentWeights()

const weightRule = z
  .number({ invalid_type_error: 'Bobot harus berupa angka.' })
  .min(0, 'Bobot minimal 0%.')
  .max(100, 'Bobot maksimal 100%.')

const formSchema = toTypedSchema(
  z
    .object({
      DAILY: weightRule,
      ASSIGNMENT: weightRule,
      PRACTICAL: weightRule,
      MIDTERM: weightRule,
      FINAL: weightRule,
    })
    .refine(
      (vals) =>
        ASSESSMENT_TYPE_ORDER.reduce((sum, type) => sum + vals[type], 0) ===
        ASSESSMENT_WEIGHT_TOTAL,
      { message: 'Total bobot harus 100%.', path: ['FINAL'] },
    ),
)

const { handleSubmit, resetForm, setValues } = useForm({
  validationSchema: formSchema,
  initialValues: {
    DAILY: 0,
    ASSIGNMENT: 0,
    PRACTICAL: 0,
    MIDTERM: 0,
    FINAL: 0,
  },
})

watch(
  [open, () => props.teachingAssignmentId],
  async ([isOpen, assignmentId]) => {
    if (!isOpen || !assignmentId) return
    await fetch(assignmentId)
    resetForm({ values: { ...weights.value } })
  },
  { immediate: true },
)

const TYPE_COLORS: Record<string, string> = {
  DAILY: 'bg-info',
  ASSIGNMENT: 'bg-success',
  PRACTICAL: 'bg-warning',
  MIDTERM: 'bg-muted-foreground',
  FINAL: 'bg-destructive',
}

const TYPE_BADGE_VARIANTS: Record<
  string,
  'info' | 'success' | 'warning' | 'secondary' | 'destructive'
> = {
  DAILY: 'info',
  ASSIGNMENT: 'success',
  PRACTICAL: 'warning',
  MIDTERM: 'secondary',
  FINAL: 'destructive',
}

const SAMPLE_SCORES: Record<string, number> = {
  DAILY: 80,
  ASSIGNMENT: 75,
  PRACTICAL: 85,
  MIDTERM: 60,
  FINAL: 90,
}

const usedTypes = computed(() =>
  ASSESSMENT_TYPE_ORDER.filter((type) => weights.value[type] > 0),
)

const sampleResult = computed(() => {
  if (!isBalanced.value || usedTypes.value.length === 0) return null
  const sum = usedTypes.value.reduce(
    (acc, type) => acc + (SAMPLE_SCORES[type] ?? 0) * weights.value[type],
    0,
  )
  return (sum / 100).toFixed(1)
})

function setWeight(
  type: (typeof ASSESSMENT_TYPE_ORDER)[number],
  value: number,
) {
  weights.value = {
    ...weights.value,
    [type]: Math.min(Math.max(value, 0), 100),
  }
}

function handleApplyDefault() {
  applyDefault()
  setValues({ ...weights.value })
}

const onSubmit = handleSubmit(async (values) => {
  if (!props.teachingAssignmentId) return
  weights.value = { ...values }
  const saved = await save(props.teachingAssignmentId)
  if (saved) {
    emit('saved', props.teachingAssignmentId)
    open.value = false
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Bobot Penilaian</DialogTitle>
        <DialogDescription>
          <template v-if="subjectName && classroomCode">
            Atur bobot tiap jenis penilaian untuk {{ subjectName }} ({{
              classroomCode
            }}) agar total 100%.
          </template>
          <template v-else>
            Atur bobot tiap jenis penilaian agar total 100%.
          </template>
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <div
          v-if="!teachingAssignmentId || loading"
          class="flex items-center justify-center py-6 text-muted-foreground"
        >
          <Loader2 class="size-5 animate-spin" />
        </div>

        <form
          v-else
          id="assessment-weight-form"
          class="grid gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-start"
          @submit.prevent="onSubmit"
        >
          <div class="space-y-3">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-control font-medium text-muted-foreground"
                  >Distribusi Bobot</span
                >
                <Button
                  type="button"
                  variant="ghost"
                  class="text-muted-foreground"
                  @click="handleApplyDefault"
                >
                  <RotateCcw class="size-4" />
                  Isi Standar
                </Button>
              </div>
              <div
                v-for="type in ASSESSMENT_TYPE_ORDER"
                :key="type"
                class="flex items-center gap-2"
              >
                <Badge
                  :variant="TYPE_BADGE_VARIANTS[type] ?? 'outline'"
                  class="w-20 justify-start shrink-0"
                >
                  {{ ASSESSMENT_TYPE_LABELS[type] }}
                </Badge>
                <div
                  class="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden"
                >
                  <div
                    class="h-full rounded-full transition-all duration-300 ease-out"
                    :class="TYPE_COLORS[type]"
                    :style="{ width: `${weights[type]}%` }"
                  />
                </div>
                <FloatingField
                  v-slot="{ value, handleChange }"
                  :name="type"
                  :label="ASSESSMENT_TYPE_LABELS[type]"
                  hide-label
                  class="w-24 shrink-0"
                >
                  <FormControl>
                    <FormattedNumberInput
                      :model-value="value"
                      numeric
                      suffix="%"
                      :max-digits="3"
                      class="text-right tabular-nums"
                      @update:model-value="
                        (next) => {
                          const numeric =
                            next === undefined
                              ? 0
                              : Math.min(Math.max(Number(next), 0), 100)
                          handleChange(numeric)
                          setWeight(type, numeric)
                        }
                      "
                    />
                  </FormControl>
                </FloatingField>
              </div>
            </div>

            <div
              class="flex items-center justify-between rounded-md border px-3 py-2 text-control transition-colors"
              :class="
                isBalanced
                  ? 'bg-success/10 border-success/30 text-success'
                  : total > 100
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : 'bg-muted/30 border-border'
              "
            >
              <div class="flex items-center gap-1.5">
                <CheckCircle2
                  v-if="isBalanced"
                  class="size-4 text-success"
                />
                <span class="font-medium">Total</span>
              </div>
              <span class="font-semibold tabular-nums">
                {{ total }}%
                <span
                  v-if="!isBalanced"
                  class="font-normal ml-1"
                  :class="
                    total > 100
                      ? 'text-destructive/80'
                      : 'text-muted-foreground'
                  "
                >
                  ({{
                    remaining > 0
                      ? `kurang ${remaining}`
                      : `lebih ${-remaining}`
                  }})
                </span>
              </span>
            </div>
          </div>

          <div class="rounded-md border bg-muted/30 p-3 text-control space-y-2">
            <span class="block font-medium">Simulasi Nilai</span>
            <template v-if="sampleResult">
              <div class="space-y-1">
                <div
                  v-for="type in usedTypes"
                  :key="type"
                  class="flex items-center justify-between text-muted-foreground"
                >
                  <span>{{ ASSESSMENT_TYPE_LABELS[type] }}</span>
                  <span class="tabular-nums">
                    {{ SAMPLE_SCORES[type] }} × {{ weights[type] }}% =
                    <span class="text-foreground font-medium">
                      {{
                        (
                          ((SAMPLE_SCORES[type] ?? 0) * weights[type]) /
                          100
                        ).toFixed(1)
                      }}
                    </span>
                  </span>
                </div>
              </div>
              <div class="border-t pt-2 flex items-center justify-between">
                <span class="font-medium">Nilai Akhir</span>
                <span class="font-semibold tabular-nums">{{
                  sampleResult
                }}</span>
              </div>
            </template>
            <p
              v-else
              class="text-muted-foreground"
            >
              Atur total bobot hingga tepat 100% untuk melihat simulasi nilai
              akhir.
            </p>
          </div>
        </form>
      </DialogBody>

      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="assessment-weight-form"
          :disabled="
            !teachingAssignmentId || !isBalanced || isSaving || loading
          "
        >
          <Loader2
            v-if="isSaving"
            class="size-4 animate-spin"
          />
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
