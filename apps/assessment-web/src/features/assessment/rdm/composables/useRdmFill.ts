import { computed, ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { extractRdmErrorMessage, rdmService } from '../services/rdmService'
import type {
  RdmCandidatesResponse,
  RdmFillResponse,
  RdmWorkbookKind,
} from '../types'

export const RDM_MAX_SUMATIF_ITEMS = 15

interface RdmFillFormValues {
  file: File | null
  templateKind: RdmWorkbookKind
  itemIds: string[]
}

export function useRdmFill(teachingAssignmentId: () => string) {
  const candidates = ref<RdmCandidatesResponse>({ sumatif: [], sas: [] })
  const loadingCandidates = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  const result = ref<RdmFillResponse | null>(null)

  const sumatifCandidates = computed(() => candidates.value.sumatif)
  const sasCandidates = computed(() => candidates.value.sas)

  const formSchema = toTypedSchema(
    z
      .object({
        file: z.custom<File | null>(
          (val): val is File =>
            val instanceof File && /\.xlsx$/i.test(val.name),
          'Pilih file template RDM (.xlsx)',
        ),
        templateKind: z.enum(['sumatif', 'sas']),
        itemIds: z.array(z.string()),
      })
      .superRefine((data, ctx) => {
        if (data.templateKind === 'sumatif') {
          if (data.itemIds.length < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['itemIds'],
              message: 'Pilih minimal satu penilaian',
            })
          } else if (data.itemIds.length > RDM_MAX_SUMATIF_ITEMS) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['itemIds'],
              message: `Maksimal ${RDM_MAX_SUMATIF_ITEMS} penilaian per file RDM`,
            })
          }
        } else if (candidates.value.sas.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['itemIds'],
            message: `Template SAS membutuhkan tepat satu penilaian SAS (saat ini ada ${candidates.value.sas.length}).`,
          })
        }
      }),
  )

  const form = useForm<RdmFillFormValues>({
    validationSchema: formSchema,
    initialValues: {
      file: null,
      templateKind: 'sumatif',
      itemIds: [],
    },
  })

  form.defineField('file')
  form.defineField('templateKind')
  form.defineField('itemIds')

  const templateKind = computed(() => form.values.templateKind ?? 'sumatif')
  const selectedIds = computed(() => form.values.itemIds ?? [])
  const selectedFile = computed(() => form.values.file ?? null)
  const selectionError = computed(() => form.errors.value.itemIds ?? null)
  const fileError = computed(() => form.errors.value.file ?? null)

  async function loadCandidates(): Promise<void> {
    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return

    loadingCandidates.value = true
    error.value = null
    try {
      const data = await rdmService.getCandidates(assignmentId)
      candidates.value = data
      const nextIds =
        data.sumatif.length <= RDM_MAX_SUMATIF_ITEMS
          ? data.sumatif.map((item) => item.id)
          : []
      form.setValues(
        {
          file: form.values.file ?? null,
          templateKind: form.values.templateKind ?? 'sumatif',
          itemIds: nextIds,
        },
        false,
      )
      form.setErrors({})
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal memuat daftar penilaian RDM.',
      )
    } finally {
      loadingCandidates.value = false
    }
  }

  function setFile(file: File | null): void {
    form.setFieldValue('file', file, false)
    form.setFieldError('file', undefined)
    error.value = null
    result.value = null
    if (file) {
      form.setFieldValue(
        'templateKind',
        /\bsas\b/i.test(file.name) ? 'sas' : 'sumatif',
        false,
      )
      void form.validateField('file')
    }
  }

  function setTemplateKind(kind: RdmWorkbookKind): void {
    form.setFieldValue('templateKind', kind, false)
    form.setFieldError('itemIds', undefined)
    error.value = null
  }

  function toggleItem(id: string): void {
    form.setFieldError('itemIds', undefined)
    const current = selectedIds.value
    if (current.includes(id)) {
      form.setFieldValue(
        'itemIds',
        current.filter((itemId) => itemId !== id),
      )
      return
    }
    if (current.length >= RDM_MAX_SUMATIF_ITEMS) {
      form.setFieldError(
        'itemIds',
        `Maksimal ${RDM_MAX_SUMATIF_ITEMS} penilaian per file RDM`,
      )
      return
    }
    form.setFieldValue('itemIds', [...current, id])
  }

  function clearSelection(): void {
    form.setFieldValue('itemIds', [])
  }

  let lastResult: RdmFillResponse | null = null

  const onSubmit = form.handleSubmit(async (values) => {
    lastResult = null
    if (!values.file || isSubmitting.value) return
    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return

    isSubmitting.value = true
    error.value = null
    try {
      const itemIds =
        values.templateKind === 'sumatif'
          ? values.itemIds
          : candidates.value.sas.length === 1
            ? [candidates.value.sas[0].id]
            : []

      const fillResult = await rdmService.fillTemplate({
        teachingAssignmentId: assignmentId,
        file: values.file,
        itemIds,
      })
      result.value = fillResult
      lastResult = fillResult
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal mengisi template RDM.',
      )
    } finally {
      isSubmitting.value = false
    }
  })

  async function submit(): Promise<RdmFillResponse | null> {
    lastResult = null
    await onSubmit()
    return lastResult
  }

  function reset(): void {
    form.resetForm({
      values: {
        file: null,
        templateKind: 'sumatif',
        itemIds: [],
      },
    })
    error.value = null
    result.value = null
  }

  return {
    form,
    candidates,
    sumatifCandidates,
    sasCandidates,
    loadingCandidates,
    templateKind,
    selectedIds,
    selectedFile,
    isSubmitting,
    error,
    fileError,
    selectionError,
    result,
    loadCandidates,
    setFile,
    setTemplateKind,
    toggleItem,
    clearSelection,
    onSubmit,
    submit,
    reset,
  }
}
