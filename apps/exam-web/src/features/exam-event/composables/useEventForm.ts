import { ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { examEventService } from '../services/examEventService'
import type {
  EventCreatePayload,
  EventUpdatePayload,
  ExamEvent,
} from '../types'
import { fromInstant } from '@/features/exam-schedule/utils/instant'
import type { ExamType } from '@/features/exam-schedule/types'

export type EventFormOptions =
  { mode: 'create'; semesterId: string } | { mode: 'edit'; event: ExamEvent }

export function useEventForm(options: EventFormOptions) {
  const existing = options.mode === 'edit' ? options.event : null
  const semesterId = options.mode === 'create' ? options.semesterId : ''
  const start = existing === null ? null : fromInstant(existing.startsAt)
  const end = existing === null ? null : fromInstant(existing.endsAt)
  const today = new Date().toISOString().slice(0, 10)

  const formSchema = toTypedSchema(
    z
      .object({
        name: z.string().trim().min(1, 'Nama kegiatan wajib diisi'),
        type: z.string().min(1, 'Pilih jenis ujian'),
        startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
        endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
        status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']),
      })
      .superRefine((value, ctx) => {
        if (!value.startDate || !value.endDate) return
        if (value.endDate < value.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
          })
        }
      }),
  )

  const { handleSubmit, isSubmitting, resetForm, values, setFieldValue } =
    useForm({
      validationSchema: formSchema,
      initialValues: {
        name: existing?.name ?? '',
        type: existing?.type ?? '',
        startDate: start?.date ?? today,
        endDate: end?.date ?? '',
        status: existing?.status ?? ('DRAFT' as const),
      },
    })

  watch(
    () => values.startDate,
    (next) => {
      if (!values.endDate) setFieldValue('endDate', next)
    },
  )

  const saveError = ref<string | null>(null)

  const onSubmit = handleSubmit(async (value) => {
    saveError.value = null
    const base = {
      name: value.name.trim(),
      startsAt: `${value.startDate}T00:00:00+07:00`,
      endsAt: `${value.endDate}T23:59:00+07:00`,
    }
    const result =
      existing !== null
        ? await examEventService.saveEvent({ mode: 'edit', id: existing.id }, {
            ...base,
            status: value.status,
          } satisfies EventUpdatePayload)
        : await examEventService.saveEvent({ mode: 'create' }, {
            semesterId,
            type: value.type as ExamType,
            ...base,
          } satisfies EventCreatePayload)
    if (!result.success) {
      saveError.value = result.error
      return false
    }
    return true
  })

  return { onSubmit, isSubmitting, saveError, resetForm, setFieldValue }
}
