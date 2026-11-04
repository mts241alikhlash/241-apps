<script setup lang="ts">
import { computed, h, nextTick, ref, watch } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { toast } from 'vue-sonner'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { FileText, Plus, XCircle } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  ActionCell,
  DataTable,
  FileDropzone,
  FormattedNumberInput,
} from '@mts241alikhlash/ui'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import {
  achievementsSchemaFor,
  isKipScholarship,
} from '../schemas/applicationFormSchemas'
import { useFormOptions } from '../composables/useFormOptions'
import { MAX_FILE_SIZE } from '../composables/useApplicationUploads'
import {
  blankAchievement,
  blankScholarship,
  type AchievementForm,
  type ScholarshipForm,
} from '../composables/useApplicationFormState'
import OptionSelect from './OptionSelect.vue'
import { vDigits } from '../vDigits'

const props = defineProps<{
  editable: boolean
  uploadAttachment: (file: File) => Promise<{ id: string } | null>
}>()

const achievements = defineModel<AchievementForm[]>('achievements', {
  required: true,
})
const scholarships = defineModel<ScholarshipForm[]>('scholarships', {
  required: true,
})

const { listOf } = useFormOptions()

const { values, validate, validateField, setValues, setFieldValue } = useForm<{
  achievements: AchievementForm[]
  scholarships: ScholarshipForm[]
}>({
  validationSchema: computed(() =>
    toTypedSchema(achievementsSchemaFor(listOf('scholarshipCategories'))),
  ),
  initialValues: {
    achievements: achievements.value,
    scholarships: scholarships.value,
  },
})

watch([achievements, scholarships], ([a, s]) =>
  setValues({ achievements: a, scholarships: s }, false),
)
watch(
  values,
  (v) => {
    if (v.achievements)
      achievements.value.splice(0, achievements.value.length, ...v.achievements)
    if (v.scholarships)
      scholarships.value.splice(0, scholarships.value.length, ...v.scholarships)
  },
  { deep: true },
)

const uploading = ref<string | null>(null)
const activeKind = ref<'achievements' | 'scholarships' | null>(null)
const activeIndex = ref(-1)
const original = ref<AchievementForm | ScholarshipForm | null>(null)
const pendingFile = ref<File | null>(null)
const achievementColumns = computed<ColumnDef<AchievementForm>[]>(() => [
  { accessorKey: 'year', header: 'Tahun' },
  { accessorKey: 'competitionName', header: 'Lomba' },
  {
    accessorKey: 'rank',
    header: 'Prestasi',
    cell: ({ row }) => row.original.rank || '—',
  },
  {
    accessorKey: 'fileName',
    header: 'Lampiran',
    cell: ({ row }) => row.original.fileName || '—',
  },
  ...(props.editable
    ? [
        {
          id: 'actions',
          header: 'Aksi',
          cell: ({ row }: { row: { index: number } }) =>
            h(ActionCell, {
              onEdit: () => openEditor('achievements', row.index),
              onDelete: ({ closeAlert }: { closeAlert: () => void }) => {
                closeAlert()
                removeAchievement(row.index)
              },
              deleteTitle: 'Hapus prestasi?',
              deleteDescription: 'Prestasi ini akan dihapus dari pendaftaran.',
            }),
          enableSorting: false,
        },
      ]
    : []),
])
const scholarshipColumns = computed<ColumnDef<ScholarshipForm>[]>(() => [
  { accessorKey: 'year', header: 'Tahun' },
  { accessorKey: 'scholarshipName', header: 'Beasiswa' },
  {
    accessorKey: 'providerName',
    header: 'Pemberi',
    cell: ({ row }) => row.original.providerName || '—',
  },
  {
    accessorKey: 'fileName',
    header: 'Lampiran',
    cell: ({ row }) => row.original.fileName || '—',
  },
  ...(props.editable
    ? [
        {
          id: 'actions',
          header: 'Aksi',
          cell: ({ row }: { row: { index: number } }) =>
            h(ActionCell, {
              onEdit: () => openEditor('scholarships', row.index),
              onDelete: ({ closeAlert }: { closeAlert: () => void }) => {
                closeAlert()
                removeScholarship(row.index)
              },
              deleteTitle: 'Hapus beasiswa?',
              deleteDescription: 'Beasiswa ini akan dihapus dari pendaftaran.',
            }),
          enableSorting: false,
        },
      ]
    : []),
])

function sync() {
  setValues(
    {
      achievements: [...achievements.value],
      scholarships: [...scholarships.value],
    },
    false,
  )
}

function addAchievement() {
  achievements.value.push(blankAchievement())
  sync()
  openEditor('achievements', achievements.value.length - 1, true)
}

function removeAchievement(index: number) {
  achievements.value.splice(index, 1)
  sync()
}

function addScholarship() {
  scholarships.value.push(blankScholarship())
  sync()
  openEditor('scholarships', scholarships.value.length - 1, true)
}

function removeScholarship(index: number) {
  scholarships.value.splice(index, 1)
  sync()
}

function attach(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectFile(file)
  input.value = ''
}

function selectFile(file: File) {
  if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
    toast.error('Format berkas harus JPG, PNG, atau PDF.')
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error('Ukuran berkas melebihi batas maksimal 5 MB.')
    return
  }
  pendingFile.value = file
}

function openEditor(
  kind: 'achievements' | 'scholarships',
  index: number,
  isNew = false,
) {
  activeKind.value = kind
  activeIndex.value = index
  original.value = isNew
    ? null
    : {
        ...(kind === 'achievements'
          ? achievements.value[index]
          : scholarships.value[index]),
      }
  pendingFile.value = null
}

function closeEditor() {
  const kind = activeKind.value
  const index = activeIndex.value
  if (kind) {
    const rows =
      kind === 'achievements' ? achievements.value : scholarships.value
    if (original.value === null) rows.splice(index, 1)
    else if (kind === 'achievements')
      achievements.value[index] = original.value as AchievementForm
    else scholarships.value[index] = original.value as ScholarshipForm
    sync()
  }
  activeKind.value = null
  pendingFile.value = null
}

const ROW_FIELDS = {
  achievements: [
    'year',
    'competitionName',
    'competitionFieldId',
    'organizer',
    'competitionLevelId',
    'rank',
  ],
  scholarships: [
    'year',
    'categoryId',
    'scholarshipName',
    'providerName',
    'providerTypeId',
    'duration',
    'kipNumber',
    'amount',
  ],
} as const

function isKip(index: number) {
  return isKipScholarship(
    listOf('scholarshipCategories'),
    values.scholarships?.[index]?.categoryId ?? '',
  )
}

async function rowValid(kind: 'achievements' | 'scholarships', index: number) {
  const results = await Promise.all(
    ROW_FIELDS[kind].map((field) =>
      validateField(`${kind}[${index}].${field}` as 'achievements'),
    ),
  )
  return results.every((result) => result.valid)
}

async function validateStep() {
  sync()
  await nextTick()
  const result = await validate()
  if (!result.valid) {
    const first = Object.keys(result.errors)
      .map((path) => /^(achievements|scholarships)\[(\d+)\]/.exec(path))
      .find((match) => match !== null)
    if (first) {
      openEditor(first[1] as 'achievements' | 'scholarships', Number(first[2]))
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve))
      await rowValid(activeKind.value!, activeIndex.value)
    }
  }
  return result
}

async function saveEditor() {
  if (!activeKind.value || uploading.value) return
  const kind = activeKind.value
  const index = activeIndex.value
  if (!(await rowValid(kind, index))) return
  if (pendingFile.value) {
    uploading.value = `${kind}-${index}`
    const stored = await props.uploadAttachment(pendingFile.value)
    uploading.value = null
    if (!stored) return
    setFieldValue(
      `${kind}[${index}].fileId` as 'achievements',
      stored.id as never,
    )
    setFieldValue(
      `${kind}[${index}].fileName` as 'achievements',
      pendingFile.value.name as never,
    )
  }
  activeKind.value = null
  pendingFile.value = null
  original.value = null
}

function clearAttachment(kind: 'achievements' | 'scholarships', index: number) {
  if (pendingFile.value) {
    pendingFile.value = null
    return
  }
  setFieldValue(`${kind}[${index}].fileId` as 'achievements', '' as never)
  setFieldValue(`${kind}[${index}].fileName` as 'achievements', '' as never)
}

defineExpose({ validate: validateStep })
</script>

<template>
  <div class="space-y-8">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader
        standard
        class="flex-wrap"
      >
        <CardTitle size="md">Prestasi Siswa</CardTitle>
        <Button
          v-if="editable"
          variant="outline"
          :disabled="achievements.length >= 20"
          @click="addAchievement"
        >
          <Plus class="mr-1.5" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent class="space-y-4 px-4 pt-4 pb-4">
        <DataTable
          :columns="achievementColumns"
          :data="achievements"
          item-label="prestasi"
          hide-per-page
          hide-pagination
          :page-size="20"
        />
        <Dialog
          v-for="(row, index) in achievements"
          :key="index"
          :open="activeKind === 'achievements' && activeIndex === index"
          @update:open="
            !$event &&
            activeKind === 'achievements' &&
            activeIndex === index &&
            closeEditor()
          "
        >
          <DialogContent size="xl">
            <DialogHeader standard>
              <DialogTitle>{{
                original === null ? 'Tambah Prestasi' : 'Edit Prestasi'
              }}</DialogTitle>
              <DialogDescription class="sr-only"
                >Isi data prestasi siswa.</DialogDescription
              >
            </DialogHeader>
            <div class="min-h-0 flex-1 overflow-y-auto">
              <div class="space-y-5 p-6">
                <div class="grid gap-5 sm:grid-cols-2">
                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`achievements[${index}].year`"
                    label="Tahun"
                    required
                  >
                    <FormControl>
                      <Input
                        v-digits
                        v-bind="componentField"
                        inputmode="numeric"
                        maxlength="4"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`achievements[${index}].competitionName`"
                    label="Nama Lomba"
                    required
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ value, handleChange, errorMessage }"
                    :name="`achievements[${index}].competitionFieldId`"
                    label="Bidang"
                    required
                  >
                    <OptionSelect
                      :invalid="!!errorMessage"
                      label="Bidang"
                      :model-value="value"
                      :options="listOf('competitionFields')"
                      :disabled="!editable"
                      @update:model-value="handleChange"
                    />
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`achievements[${index}].organizer`"
                    label="Penyelenggara"
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ value, handleChange, errorMessage }"
                    :name="`achievements[${index}].competitionLevelId`"
                    label="Tingkat"
                    required
                  >
                    <OptionSelect
                      :invalid="!!errorMessage"
                      label="Tingkat"
                      :model-value="value"
                      :options="listOf('competitionLevels')"
                      :disabled="!editable"
                      @update:model-value="handleChange"
                    />
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`achievements[${index}].rank`"
                    label="Peringkat"
                    required
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>
                </div>
                <div
                  class="space-y-2 text-[length:var(--text-control,0.75rem)]"
                >
                  <p class="font-medium">Lampiran</p>
                  <FileDropzone
                    v-if="editable"
                    :file-name="pendingFile?.name || row.fileName"
                    clearable
                    :disabled="!!uploading"
                    aria-label="Pilih lampiran"
                    hint="JPG, PNG, atau PDF, maks. 5 MB"
                    @change="attach($event)"
                    @clear="clearAttachment('achievements', index)"
                  />
                  <div
                    v-else-if="pendingFile || row.fileName"
                    class="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 p-4"
                  >
                    <span
                      class="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"
                    >
                      <FileText class="size-5" />
                    </span>
                    <span class="min-w-0 flex-1 truncate font-medium">{{
                      pendingFile?.name || row.fileName
                    }}</span>
                    <Button
                      v-if="editable"
                      variant="ghost"
                      size="icon"
                      class="shrink-0"
                      aria-label="Lepas lampiran"
                      @click="clearAttachment('achievements', index)"
                    >
                      <XCircle class="size-4" />
                    </Button>
                  </div>
                  <p
                    v-else
                    class="text-muted-foreground"
                  >
                    Tidak ada lampiran.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter
              standard
              class="justify-between"
            >
              <Button
                variant="outline"
                :disabled="!!uploading"
                @click="closeEditor"
                >Batal</Button
              >
              <Button
                :disabled="!!uploading"
                @click="saveEditor"
                >{{ uploading ? 'Mengunggah…' : 'Simpan' }}</Button
              >
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>

    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader
        standard
        class="flex-wrap"
      >
        <CardTitle size="md">Beasiswa & Bantuan</CardTitle>
        <Button
          v-if="editable"
          variant="outline"
          :disabled="scholarships.length >= 20"
          @click="addScholarship"
        >
          <Plus class="mr-1.5" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent class="space-y-4 px-4 pt-4 pb-4">
        <DataTable
          :columns="scholarshipColumns"
          :data="scholarships"
          item-label="beasiswa"
          hide-per-page
          hide-pagination
          :page-size="20"
        />
        <Dialog
          v-for="(row, index) in scholarships"
          :key="index"
          :open="activeKind === 'scholarships' && activeIndex === index"
          @update:open="
            !$event &&
            activeKind === 'scholarships' &&
            activeIndex === index &&
            closeEditor()
          "
        >
          <DialogContent size="xl">
            <DialogHeader standard>
              <DialogTitle>{{
                original === null ? 'Tambah Beasiswa' : 'Edit Beasiswa'
              }}</DialogTitle>
              <DialogDescription class="sr-only"
                >Isi data beasiswa siswa.</DialogDescription
              >
            </DialogHeader>
            <div class="min-h-0 flex-1 overflow-y-auto">
              <div class="space-y-5 p-6">
                <div class="grid gap-5 sm:grid-cols-2">
                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`scholarships[${index}].year`"
                    label="Tahun"
                    required
                  >
                    <FormControl>
                      <Input
                        v-digits
                        v-bind="componentField"
                        inputmode="numeric"
                        maxlength="4"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ value, handleChange, errorMessage }"
                    :name="`scholarships[${index}].categoryId`"
                    label="Kategori"
                    required
                  >
                    <OptionSelect
                      :invalid="!!errorMessage"
                      label="Kategori"
                      :model-value="value"
                      :options="listOf('scholarshipCategories')"
                      :disabled="!editable"
                      @update:model-value="handleChange"
                    />
                  </FloatingField>

                  <FloatingField
                    v-if="isKip(index)"
                    v-slot="{ componentField }"
                    :name="`scholarships[${index}].kipNumber`"
                    label="No. KIP"
                    required
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        maxlength="30"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`scholarships[${index}].scholarshipName`"
                    label="Nama Beasiswa"
                    required
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`scholarships[${index}].providerName`"
                    label="Instansi Pemberi"
                    required
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ value, handleChange, errorMessage }"
                    :name="`scholarships[${index}].providerTypeId`"
                    label="Jenis Instansi"
                    required
                  >
                    <OptionSelect
                      :invalid="!!errorMessage"
                      label="Jenis Instansi"
                      :model-value="value"
                      :options="listOf('scholarshipProviderTypes')"
                      :disabled="!editable"
                      @update:model-value="handleChange"
                    />
                  </FloatingField>

                  <FloatingField
                    v-slot="{ componentField }"
                    :name="`scholarships[${index}].duration`"
                    label="Jangka Waktu"
                  >
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        :disabled="!editable"
                      />
                    </FormControl>
                  </FloatingField>

                  <FloatingField
                    v-slot="{ value, setValue }"
                    :name="`scholarships[${index}].amount`"
                    label="Jumlah"
                  >
                    <FormControl>
                      <FormattedNumberInput
                        :name="`scholarships[${index}].amount`"
                        :model-value="value"
                        prefix="Rp. "
                        suffix=",-"
                        thousands
                        :max-digits="12"
                        :disabled="!editable"
                        @update:model-value="setValue"
                      />
                    </FormControl>
                  </FloatingField>
                </div>
                <div
                  class="space-y-2 text-[length:var(--text-control,0.75rem)]"
                >
                  <p class="font-medium">Lampiran</p>
                  <FileDropzone
                    v-if="editable"
                    :file-name="pendingFile?.name || row.fileName"
                    clearable
                    :disabled="!!uploading"
                    aria-label="Pilih lampiran"
                    hint="JPG, PNG, atau PDF, maks. 5 MB"
                    @change="attach($event)"
                    @clear="clearAttachment('scholarships', index)"
                  />
                  <div
                    v-else-if="pendingFile || row.fileName"
                    class="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 p-4"
                  >
                    <span
                      class="shrink-0 rounded-lg bg-primary/10 p-2 text-primary"
                    >
                      <FileText class="size-5" />
                    </span>
                    <span class="min-w-0 flex-1 truncate font-medium">{{
                      pendingFile?.name || row.fileName
                    }}</span>
                    <Button
                      v-if="editable"
                      variant="ghost"
                      size="icon"
                      class="shrink-0"
                      aria-label="Lepas lampiran"
                      @click="clearAttachment('scholarships', index)"
                    >
                      <XCircle class="size-4" />
                    </Button>
                  </div>
                  <p
                    v-else
                    class="text-muted-foreground"
                  >
                    Tidak ada lampiran.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter
              standard
              class="justify-between"
            >
              <Button
                variant="outline"
                :disabled="!!uploading"
                @click="closeEditor"
                >Batal</Button
              >
              <Button
                :disabled="!!uploading"
                @click="saveEditor"
                >{{ uploading ? 'Mengunggah…' : 'Simpan' }}</Button
              >
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  </div>
</template>
