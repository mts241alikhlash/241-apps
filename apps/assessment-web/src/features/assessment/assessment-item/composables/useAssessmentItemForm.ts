import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import type { TeachingAssignment } from '@/features/lookup/teaching-assignment/types'
import { assessmentItemService } from '../services/assessmentItemService'
import { useAssessmentItemStore } from '../stores/assessmentItemStore'
import type { AssessmentItem, AssessmentType } from '../types'

interface AssessmentItemFormValues {
  gradeId: string
  classroomId: string
  subjectId: string
  name: string
  type: AssessmentType
  weight: number
  maxScore: number
}

export function useAssessmentItemForm(options: {
  assignments: () => TeachingAssignment[]
  gradeIdForClassroom: (classroomId: string | null) => string | null
  initialClassroomId: () => string | null
  initialSubjectId: () => string | null
  editData?: () => AssessmentItem | null
  isOpen?: () => boolean
  defaultType?: () => AssessmentType
  onSuccess?: () => void | Promise<void>
}) {
  const store = useAssessmentItemStore()
  const { isSaving, formError } = storeToRefs(store)

  const formSchema = toTypedSchema(
    z.object({
      gradeId: z.string().min(1, 'Tingkat wajib dipilih.'),
      classroomId: z.string().min(1, 'Kelas wajib dipilih.'),
      subjectId: z.string().min(1, 'Mata pelajaran wajib dipilih.'),
      name: z
        .string()
        .min(1, 'Nama tugas wajib diisi.')
        .max(100, 'Nama tugas maksimal 100 karakter.'),
      type: z.enum(['DAILY', 'MIDTERM', 'FINAL', 'ASSIGNMENT', 'PRACTICAL']),
      weight: z.number().min(0, 'Bobot minimal 0.'),
      maxScore: z
        .number()
        .min(1, 'Skor maksimal minimal 1.')
        .max(100, 'Skor maksimal tidak boleh lebih dari 100.'),
    }),
  )

  const form = useForm<AssessmentItemFormValues>({
    validationSchema: formSchema,
    initialValues: {
      gradeId: '',
      classroomId: '',
      subjectId: '',
      name: '',
      type: options.defaultType?.() ?? 'DAILY',
      weight: 1,
      maxScore: 100,
    },
  })

  watch(
    [() => options.isOpen?.() ?? true, () => options.editData?.()],
    ([isOpen, data]) => {
      if (isOpen === false) return
      formError.value = null
      if (data) {
        const assignment = options
          .assignments()
          .find((a) => a.id === data.teachingAssignmentId)
        const classroomId =
          assignment?.classroomId ??
          data.teachingAssignment?.classroom?.id ??
          data.teachingAssignmentId
        form.setValues({
          gradeId: options.gradeIdForClassroom(classroomId) ?? classroomId,
          classroomId,
          subjectId:
            assignment?.subjectId ??
            data.teachingAssignment?.subject?.id ??
            data.teachingAssignmentId,
          name: data.name,
          type: data.type,
          weight: data.weight,
          maxScore: data.maxScore,
        })
      } else {
        const initialClassroom = options.initialClassroomId()
        form.resetForm({
          values: {
            gradeId: options.gradeIdForClassroom(initialClassroom) ?? '',
            classroomId: initialClassroom ?? '',
            subjectId: options.initialSubjectId() ?? '',
            name: '',
            type: options.defaultType?.() ?? 'DAILY',
            weight: 1,
            maxScore: 100,
          },
        })
      }
    },
    { immediate: true },
  )

  const isEditing = computed(() => !!options.editData?.())

  const onSubmit = form.handleSubmit(
    async (values: AssessmentItemFormValues) => {
      const editItem = options.editData?.()
      const fields = {
        name: values.name,
        type: values.type,
        weight: values.weight,
        maxScore: values.maxScore,
      }

      const targetAssignment = editItem
        ? undefined
        : options
            .assignments()
            .find(
              (a) =>
                a.classroomId === values.classroomId &&
                a.subjectId === values.subjectId,
            )

      if (!editItem && !targetAssignment) {
        store.formError =
          'Belum ada jadwal mengajar untuk kelas dan mata pelajaran ini.'
        return
      }

      const result = await assessmentItemService.saveItem(
        editItem
          ? fields
          : { ...fields, teachingAssignmentId: targetAssignment!.id },
        editItem?.id,
      )
      if (result.success) {
        if (options.onSuccess) {
          await options.onSuccess()
        }
        form.resetForm()
      }
    },
  )

  return { form, isSaving, formError, isEditing, onSubmit }
}
