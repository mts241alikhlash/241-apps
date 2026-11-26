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
  material: string
  kktp: number | null
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
      material: z
        .string()
        .max(500, 'Ringkasan materi maksimal 500 karakter.')
        .optional(),
      kktp: z
        .number({ invalid_type_error: 'KKTP harus berupa angka.' })
        .int('KKTP harus bilangan bulat.')
        .min(0, 'KKTP minimal 0.')
        .max(100, 'KKTP maksimal 100.')
        .nullable()
        .optional(),
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
      material: '',
      kktp: null,
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
          material: data.material ?? '',
          kktp: data.kktp ?? null,
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
            material: '',
            kktp: null,
          },
        })
      }
    },
    { immediate: true },
  )

  const isEditing = computed(() => !!options.editData?.())

  const showRenameWarning = computed(() => {
    const editItem = options.editData?.()
    if (!editItem) return false
    const hasScores =
      (editItem.gradedCount ?? 0) > 0 ||
      (editItem._count?.studentScores ?? 0) > 0
    if (!hasScores) return false
    const typedName = (form.values.name ?? '').trim().toLowerCase()
    const savedName = editItem.name.trim().toLowerCase()
    return typedName !== savedName
  })

  const onSubmit = form.handleSubmit(
    async (values: AssessmentItemFormValues) => {
      const editItem = options.editData?.()
      const trimmedMaterial = values.material?.trim() ?? ''
      const fields = {
        name: values.name,
        type: values.type,
        weight: values.weight,
        maxScore: values.maxScore,
        material: trimmedMaterial.length > 0 ? trimmedMaterial : null,
        kktp: values.kktp ?? null,
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
        return
      }
      if ('fieldErrors' in result && result.fieldErrors?.name) {
        form.setFieldError('name', result.fieldErrors.name)
      }
    },
  )

  return {
    form,
    isSaving,
    formError,
    isEditing,
    showRenameWarning,
    onSubmit,
  }
}
