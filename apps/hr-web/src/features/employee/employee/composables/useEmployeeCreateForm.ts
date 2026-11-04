import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import {
  useAddressSubform,
  useDynamicEntryList,
  useMultiStepForm,
} from '@/features/shared/multi-step-form'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import api from '@mts241alikhlash/web-shared/utils/api'
import { employeeApi } from '../api/employeeApi'
import { employeeService } from '../services/employeeService'
import { buildEmployeeCreatePayload } from '../utils'
import { usePositionCategoryFilter } from './usePositionCategoryFilter'
import { useReferenceList } from '@/features/platform/reference-data'
import type {
  EmploymentTypeOption,
  PositionListItem,
  EmployeePositionInput,
} from '../types'

export function useEmployeeCreateForm() {
  const router = useRouter()

  const steps = [
    { value: 1, title: 'Profil' },
    { value: 2, title: 'Kepegawaian' },
    { value: 3, title: 'Alamat' },
    { value: 4, title: 'Jabatan' },
    { value: 5, title: 'Ringkasan' },
  ]

  const employmentTypes = ref<EmploymentTypeOption[]>([])
  const positions = ref<PositionListItem[]>([])

  const formSchema = toTypedSchema(
    z.object({
      name: z
        .string()
        .min(1, 'Mohon masukkan nama lengkap guru.')
        .max(100, 'Nama tidak boleh lebih dari 100 karakter.'),
      nik: z
        .string()
        .min(1, 'Nomor Induk Kependudukan (NIK) wajib diisi.')
        .length(16, 'NIK harus berjumlah tepat 16 digit angka.'),
      gender: z.string().min(1, 'Silakan pilih jenis kelamin guru.'),
      birthPlace: z
        .string()
        .min(1, 'Kota tempat lahir wajib dicantumkan.')
        .max(100, 'Tempat lahir tidak boleh lebih dari 100 karakter.'),
      birthDate: z.string().min(1, 'Mohon tentukan tanggal lahir guru.'),
      email: z
        .string()
        .max(255)
        .email('Format alamat email tidak valid.')
        .optional()
        .or(z.literal('')),
      phone: z.string().max(15).optional().or(z.literal('')),
      nip: z.string().max(20).optional().or(z.literal('')),
      nuptk: z.string().max(20).optional().or(z.literal('')),
      employmentTypeId: z
        .string()
        .min(1, 'Silakan pilih status kepegawaian saat ini.'),
      positionId: z.string().optional().default(''),
    }),
  )

  const { values, validateField, setFieldValue } = useForm({
    validationSchema: formSchema,
    keepValuesOnUnmount: true,
    initialValues: {
      name: '',
      nik: '',
      gender: 'MALE',
      birthPlace: '',
      birthDate: '',
      email: '',
      phone: '',
      nip: '',
      nuptk: '',
      employmentTypeId: '',
      positionId: '',
    },
  })

  const { kategori, categoryOptions, filteredPositions } =
    usePositionCategoryFilter(positions)

  const { address, hasAddress, validateAddress } = useAddressSubform()

  const {
    items: extraPositions,
    addItem: addPosition,
    removeItem: removePosition,
  } = useDynamicEntryList<EmployeePositionInput>(() => ({
    positionId: '',
    hireDate: new Date().toISOString().substring(0, 10),
    isPrimary: false,
  }))

  type FieldName = Parameters<typeof validateField>[0]
  const PROFIL_FIELDS: FieldName[] = [
    'name',
    'nik',
    'gender',
    'birthPlace',
    'birthDate',
  ]
  const KEPEG_FIELDS: FieldName[] = ['employmentTypeId']

  const {
    activeStep,
    submitting,
    mobileVisibleStepValues,
    goToStep,
    next,
    back,
    validateAllGates,
  } = useMultiStepForm<FieldName>({
    steps,
    validateField,
    gates: [
      { fields: PROFIL_FIELDS, unlocksStep: 2 },
      { fields: KEPEG_FIELDS, unlocksStep: 3 },
    ],
    onCancel: () => void router.push('/staff'),
  })

  function isValidPosition(p: EmployeePositionInput): boolean {
    return p.positionId !== '' && p.hireDate !== ''
  }

  async function submit() {
    if (!(await validateAllGates())) {
      return
    }
    if (!validateAddress()) {
      activeStep.value = 3
      toast.error('Lengkapi alamat (desa, kecamatan, kota, provinsi, negara).')
      return
    }
    const invalidPosition = extraPositions.value.find(
      (p) => !isValidPosition(p),
    )
    if (invalidPosition) {
      activeStep.value = 4
      toast.error('Lengkapi jabatan: pilih jabatan dan tanggal mulai.')
      return
    }

    submitting.value = true
    try {
      const result = await employeeService.createEmployeeWithRelations({
        core: buildEmployeeCreatePayload(values),
        address: hasAddress.value ? { ...address.value } : null,
        positions: extraPositions.value,
      })

      if (!result.success) {
        toast.error('Gagal menyimpan data guru. Periksa kembali isian Anda.')
        return
      }
      toast.success('Pegawai baru berhasil disimpan.')
      result.warnings.forEach((w) => toast.warning(w))
      if (result.userId) {
        void router.push(`/profile/EMPLOYEE/${result.userId}`)
      } else {
        void router.push('/staff')
      }
    } finally {
      submitting.value = false
    }
  }

  onMounted(async () => {
    try {
      employmentTypes.value = await useReferenceList().read(
        'employmentTypes',
        async () => {
          const res = await api.get<{ data: EmploymentTypeOption[] }>(
            '/employment-types',
            { params: { limit: PAGINATION.REFERENCE_LIMIT } },
          )
          return res.data.data ?? []
        },
      )
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data pilihan.'),
      )
    }
  })

  watch(
    activeStep,
    (step) => {
      if (step < 4 || positions.value.length > 0) return
      void useReferenceList()
        .read('positions', async () => {
          const res = await employeeApi.getPositions({
            limit: PAGINATION.REFERENCE_LIMIT,
            isActive: true,
          })
          return res.data.data ?? []
        })
        .then((list) => {
          positions.value = list
        })
        .catch((error: unknown) => {
          toast.error(
            getIndonesianErrorMessage(error, 'Gagal memuat data jabatan.'),
          )
        })
    },
    { immediate: true },
  )

  const setFieldValueWrapper = (field: string, value: unknown) => {
    setFieldValue(
      field as Parameters<typeof setFieldValue>[0],
      value as Parameters<typeof setFieldValue>[1],
    )
  }

  return {
    steps,
    activeStep,
    submitting,
    mobileVisibleStepValues,
    goToStep,
    next,
    back,
    values,
    setFieldValue: setFieldValueWrapper,
    kategori,
    categoryOptions,
    filteredPositions,
    address,
    hasAddress,
    extraPositions,
    addPosition,
    removePosition,
    employmentTypes,
    positions,
    submit,
  }
}
