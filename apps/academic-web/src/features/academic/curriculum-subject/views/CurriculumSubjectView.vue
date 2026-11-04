<script setup lang="ts">
import type { CurriculumSubject, CurriculumSubjectSavePayload } from '../types'
import CurriculumSubjectFormDialog from '../components/CurriculumSubjectFormDialog.vue'
import AddCurriculumSubjectDialog from '../components/AddCurriculumSubjectDialog.vue'
import { createCurriculumSubjectColumns } from '../components/columns'
import { useCurriculumSubject } from '../composables/useCurriculumSubject'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { DataTable, BackButton } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const curriculumId = route.params.id as string

const {
  items,
  loading,
  isSaving,
  formError,
  curriculumName,
  curriculumAcademicYear,
  fetchCurriculumSubjects,
  fetchCurriculumInfo,
  saveCurriculumSubject,
  bulkCreateCurriculumSubjects,
  deleteCurriculumSubject,
} = useCurriculumSubject()

useBreadcrumbs(() => [
  { title: 'Akademik', href: '#' },
  { title: 'Kurikulum', href: '/academic/curriculum' },
  { title: curriculumName.value || 'Detail', href: route.path },
])

const isAddDialogOpen = ref(false)
const isEditSheetOpen = ref(false)
const editingItem = ref<CurriculumSubject | null>(null)
const { can } = useRoleGuard()

const existingSubjectIds = computed(() =>
  items.value.map((item) => item.subjectId),
)

const tableColumns = createCurriculumSubjectColumns({
  showActions:
    can('curriculum-subjects.update') || can('curriculum-subjects.delete'),
  canUpdate: can('curriculum-subjects.update'),
  canDelete: can('curriculum-subjects.delete'),
  onEdit: (item: CurriculumSubject) => {
    editingItem.value = item
    isEditSheetOpen.value = true
  },
  onDelete: async (item: CurriculumSubject, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteCurriculumSubject(item.id)
    setLoading(false)
    if (result.success) {
      closeAlert()
      void fetchCurriculumSubjects(curriculumId)
    }
  },
})

async function handleSaveCurriculumSubject(
  payload: CurriculumSubjectSavePayload,
) {
  const result = await saveCurriculumSubject(
    editingItem.value?.id ?? null,
    payload,
  )
  if (result.success) {
    isEditSheetOpen.value = false
    void fetchCurriculumSubjects(curriculumId)
  }
}

async function handleBulkSave(subjectIds: string[]) {
  const result = await bulkCreateCurriculumSubjects(curriculumId, subjectIds)
  if (result.success) {
    isAddDialogOpen.value = false
    void fetchCurriculumSubjects(curriculumId)
  }
}

watch(isEditSheetOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

onMounted(async () => {
  await Promise.all([
    fetchCurriculumInfo(curriculumId),
    fetchCurriculumSubjects(curriculumId),
  ])
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar kurikulum"
            @click="router.push('/academic/curriculum')"
          />
          <div class="grid gap-0.5">
            <CardTitle size="lg"> Mata Pelajaran Kurikulum </CardTitle>
            <CardDescription v-if="curriculumName">
              Kurikulum: {{ curriculumName }} ({{ curriculumAcademicYear }})
            </CardDescription>
          </div>
        </div>
        <Button
          v-if="can('curriculum-subjects.create')"
          @click="isAddDialogOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="items"
          :is-loading="loading"
          item-label="mata pelajaran kurikulum"
          filter-column="subject"
          filter-placeholder="Cari mata pelajaran..."
        />

        <CurriculumSubjectFormDialog
          v-if="can('curriculum-subjects.update') && isEditSheetOpen"
          v-model:open="isEditSheetOpen"
          :form-error="formError"
          :is-saving="isSaving"
          :curriculum-id="curriculumId"
          :edit-data="editingItem"
          @save="handleSaveCurriculumSubject"
        />

        <AddCurriculumSubjectDialog
          v-if="isAddDialogOpen"
          v-model:open="isAddDialogOpen"
          :existing-subject-ids="existingSubjectIds"
          :saving="isSaving"
          @save="handleBulkSave"
        />
      </CardContent>
    </Card>
  </div>
</template>
