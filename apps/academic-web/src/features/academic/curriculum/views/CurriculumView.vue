<script setup lang="ts">
import type { Curriculum } from '../types'
import CurriculumFormDialog from '../components/CurriculumFormDialog.vue'
import { createCurriculumColumns } from '../components/columns'
import { useCurriculumList } from '../composables/useCurriculumList'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { onMounted, ref, watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'

const router = useRouter()
const {
  curricula,
  academicYears,
  loading,
  fetchCurricula,
  fetchAcademicYears,
  deleteCurriculum,
} = useCurriculumList()

const isAddModalOpen = ref(false)
const editingItem = ref<Curriculum | null>(null)
const { can } = useRoleGuard()

const tableColumns = createCurriculumColumns({
  showActions: can('curricula.update') || can('curricula.delete'),
  canUpdate: can('curricula.update'),
  canDelete: can('curricula.delete'),
  onView: (item: Curriculum) => {
    void router.push(`/academic/curriculum/${item.id}/subject`)
  },
  onEdit: (item: Curriculum) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: Curriculum, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteCurriculum(item.id)
    if (result.success) {
      refetchCurrentYear()
      closeAlert()
    }
    setLoading(false)
  },
})

watch(isAddModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
  }
})

const selectedAcademicYearId = ref('')

function onAcademicYearChange(value: unknown) {
  const academicYearId = typeof value === 'string' ? value : ''
  selectedAcademicYearId.value = academicYearId
  void fetchCurricula(academicYearId || undefined)
}

function refetchCurrentYear() {
  void fetchCurricula(selectedAcademicYearId.value || undefined)
}

onMounted(async () => {
  await Promise.all([fetchCurricula(), fetchAcademicYears()])
  selectedAcademicYearId.value =
    academicYears.value.find((y) => y.isActive)?.id ?? ''
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
        <CardTitle size="lg"> Kurikulum </CardTitle>
        <Button
          v-if="can('curricula.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="curricula"
          :is-loading="loading"
          item-label="kurikulum"
          filter-column="name"
          filter-placeholder="Cari kurikulum..."
        >
          <template #header-right>
            <Select
              :model-value="selectedAcademicYearId"
              @update:model-value="onAcademicYearChange"
            >
              <SelectTrigger class="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="year in academicYears"
                  :key="year.id"
                  :value="year.id"
                >
                  {{ year.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </template>
        </DataTable>

        <CurriculumFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :academic-years="academicYears"
          :edit-data="editingItem"
          @save-success="refetchCurrentYear"
        />
      </CardContent>
    </Card>
  </div>
</template>
