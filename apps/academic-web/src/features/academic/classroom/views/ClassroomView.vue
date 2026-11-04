<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Classroom } from '../types'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import { Plus } from '@lucide/vue'
import { DataTable, ServiceUnavailable, SearchInput } from '@mts241alikhlash/ui'
import { createClassroomColumns } from '../components/columns'
import ClassroomFormDialog from '../components/ClassroomFormDialog.vue'
import { useRoleGuard } from '@/features/platform/auth'
import { useClassroomList } from '../composables/useClassroomList'
import { watchDebounced } from '@vueuse/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'

const router = useRouter()

const {
  classrooms,
  academicYears,
  totalClassrooms,
  loading,
  outage,
  currentFilters,
  fetchClassrooms,
  fetchAcademicYears,
  fetchSemesters,
  deleteClassroom,
} = useClassroomList()
const searchKeyword = ref(currentFilters.value.search ?? '')

watchDebounced(
  searchKeyword,
  (val) => {
    void fetchClassrooms({
      search: val.trim() || '',
      page: 1,
    })
  },
  { debounce: 500 },
)

const selectedAcademicYearId = ref('')

function onAcademicYearChange(value: unknown) {
  const academicYearId = typeof value === 'string' ? value : ''
  selectedAcademicYearId.value = academicYearId
  void fetchClassrooms({ academicYearId: academicYearId || undefined, page: 1 })
}

const isAddModalOpen = ref(false)
const { can } = useRoleGuard()

const tableColumns = createClassroomColumns({
  showActions: can('classrooms.update') || can('classrooms.delete'),
  canUpdate: can('classrooms.update'),
  canDelete: can('classrooms.delete'),
  onManageSupervisor: (item: Classroom) => {
    void router.push({ name: 'classroom-manage', params: { id: item.id } })
  },
  onDelete: async (item: Classroom, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteClassroom(item.id)
    if (result.success) {
      await fetchClassrooms()
      closeAlert()
    }
    setLoading(false)
  },
})

onMounted(async () => {
  await fetchSemesters()
  await Promise.all([fetchClassrooms(), fetchAcademicYears()])
  selectedAcademicYearId.value =
    currentFilters.value.academicYearId ??
    academicYears.value.find((y) => y.isActive)?.id ??
    ''
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
        <CardTitle size="lg"> Kelas </CardTitle>
        <Button
          v-if="can('classrooms.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <ServiceUnavailable
          v-if="outage"
          :message="outage"
          subject="Daftar kelas"
          :is-retrying="loading"
          :retry="() => fetchClassrooms()"
        />

        <DataTable
          :columns="tableColumns"
          :data="classrooms"
          :total-items="totalClassrooms"
          :page="currentFilters.page"
          :is-loading="loading"
          item-label="kelas"
          @update:page="(page) => fetchClassrooms({ page })"
          @update:page-size="(limit) => fetchClassrooms({ limit, page: 1 })"
        >
          <template #header-right>
            <div class="flex items-center gap-2">
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

              <SearchInput
                v-model="searchKeyword"
                label="Cari kelas"
              />
            </div>
          </template>
        </DataTable>

        <ClassroomFormDialog
          v-if="can('classrooms.create') && isAddModalOpen"
          v-model:open="isAddModalOpen"
          :academic-years="academicYears"
          @save-success="fetchClassrooms"
        />
      </CardContent>
    </Card>
  </div>
</template>
