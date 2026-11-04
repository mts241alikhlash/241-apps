<script setup lang="ts">
import { createColumns } from '../components/columns'
import { ImportPreviewDialog } from '@/features/academic/shared/import-preview'
import { studentImportColumns } from '../importPreviewColumns'
import { ImportExportDialog } from '@/features/academic/shared/import-export'
import { studentImportExportLabels } from '../importExportLabels'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { watchDebounced } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStudent } from '../composables/useStudent'
import { useStudentImportExport } from '../composables/useStudentImportExport'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import { ArrowLeftRight, Plus, Filter } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { useRoleGuard } from '@/features/platform/auth'

const { can } = useRoleGuard()

const canImport = computed(
  () => can('students.create') && can('students.update'),
)
const router = useRouter()

const isFilterDialogOpen = ref(false)

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.gradeId !== 'all') count++
  if (filters.value.classroomId !== 'all') count++
  return count
})

function resetAllFilters() {
  filters.value.gradeId = 'all'
  filters.value.classroomId = 'all'
}

function handleFilterChange(key: 'gradeId' | 'classroomId', value: unknown) {
  filters.value[key] = typeof value === 'string' ? value : 'all'
}
const {
  students,
  classrooms,
  grades,
  loading,
  filters,
  totalStudents,
  currentPage,
  pageSize,
  fetchStudents,
  fetchClassrooms,
  fetchGrades,
  deleteStudent,
  setPage,
  setPageSize,
} = useStudent()

const tableColumns = computed(() =>
  createColumns(
    {
      onViewDetail: (student) => {
        void router.push(`/profile/STUDENT/${student.user.id}`)
      },
      onDelete: async (student, { closeAlert, setLoading }) => {
        setLoading(true)
        try {
          await deleteStudent(student.id)
          toast.success('Siswa berhasil dihapus')
          await fetchStudents()
          closeAlert()
        } catch (e: unknown) {
          toast.error(
            getIndonesianErrorMessage(e, 'Gagal menghapus data siswa'),
          )
        } finally {
          setLoading(false)
        }
      },
      showActions: can('students.update') || can('students.delete'),
      canUpdate: can('students.update'),
      canDelete: can('students.delete'),
    },
    grades.value,
  ),
)

const {
  isImportExportOpen,
  isImporting,
  isConflictDialogOpen,
  isResolvingConflicts,
  resolveProgress,
  conflictRows,
  downloadTemplate,
  exportData,
  handleFileUpload,
  handleResolveConflicts,
} = useStudentImportExport({
  students: students,
  classes: classrooms,
  onImportSuccess: () => {
    void fetchStudents()
  },
})

watch(
  () => filters.value.gradeId,
  async (newGradeId) => {
    filters.value.classroomId = 'all'
    currentPage.value = 1
    await fetchClassrooms(newGradeId === 'all' ? undefined : newGradeId)
    await fetchStudents()
  },
)

watch(
  () => filters.value.classroomId,
  () => {
    currentPage.value = 1
    void fetchStudents()
  },
)

watchDebounced(
  () => filters.value.keyword,
  () => {
    currentPage.value = 1
    void fetchStudents()
  },
  { debounce: 400 },
)

onMounted(async () => {
  await Promise.all([fetchStudents(), fetchClassrooms(), fetchGrades()])
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
        <div>
          <CardTitle size="lg"> Daftar Siswa </CardTitle>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-2">
            <Button
              v-if="canImport"
              variant="outline"
              size="sm"
              class="h-10 px-4 bg-white"
              @click="isImportExportOpen = true"
            >
              <ArrowLeftRight class="size-4 mr-2" />
              Import / Export
            </Button>
            <Button
              v-if="can('students.create')"
              size="sm"
              class="h-10 px-4"
              @click="router.push('/student/create')"
            >
              <Plus class="size-4 mr-2" />
              Tambah Siswa
            </Button>
          </div>

          <div
            v-if="can('students.create')"
            class="flex sm:hidden"
          >
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  size="sm"
                  class="h-9 px-3 gap-1"
                >
                  <Plus class="size-4" />
                  Tambah
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-48"
              >
                <DropdownMenuItem @click="router.push('/student/create')">
                  <Plus class="size-4 mr-2 text-muted-foreground" />
                  Tambah Siswa
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="canImport"
                  @click="isImportExportOpen = true"
                >
                  <ArrowLeftRight class="size-4 mr-2 text-muted-foreground" />
                  Import / Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent
        variant="standard"
        class="pt-1"
      >
        <div class="mb-6">
          <div class="hidden lg:flex lg:flex-row lg:items-center gap-3">
            <Select
              :model-value="filters.gradeId"
              @update:model-value="handleFilterChange('gradeId', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[145px] px-3! gap-2!"
              >
                <SelectValue placeholder="Pilih tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Semua Tingkat </SelectItem>
                <SelectItem
                  v-for="lvl in grades"
                  :key="lvl.id"
                  :value="lvl.id"
                >
                  {{ lvl.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="filters.classroomId"
              @update:model-value="handleFilterChange('classroomId', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[140px] px-3! gap-2!"
              >
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Semua Kelas </SelectItem>
                <SelectItem
                  v-for="cls in classrooms"
                  :key="cls.id"
                  :value="cls.id"
                >
                  {{ cls.code }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col lg:hidden gap-3">
            <Button
              variant="outline"
              class="w-full relative justify-center"
              @click="isFilterDialogOpen = true"
            >
              <Filter class="size-4 mr-2" />
              Filter Siswa
              <span
                v-if="activeFiltersCount > 0"
                class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {{ activeFiltersCount }}
              </span>
            </Button>
          </div>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="students"
          :is-loading="loading"
          :total-items="totalStudents"
          :page="currentPage"
          :page-size="pageSize"
          item-label="siswa"
          @update:page="setPage"
          @update:page-size="setPageSize"
        >
          <template #header-right>
            <SearchInput
              v-model="filters.keyword"
              label="Cari siswa"
            />
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="isFilterDialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Filter Siswa</DialogTitle>
        <DialogDescription class="sr-only">
          Saring daftar siswa berdasarkan tingkat dan kelas.
        </DialogDescription>
      </DialogHeader>

      <div class="p-6 space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Tingkat</label
          >
          <Select
            :model-value="filters.gradeId"
            @update:model-value="handleFilterChange('gradeId', $event)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"> Semua Tingkat </SelectItem>
              <SelectItem
                v-for="lvl in grades"
                :key="lvl.id"
                :value="lvl.id"
              >
                {{ lvl.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-muted-foreground"
            >Kelas</label
          >
          <Select
            :model-value="filters.classroomId"
            @update:model-value="handleFilterChange('classroomId', $event)"
          >
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Pilih kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"> Semua Kelas </SelectItem>
              <SelectItem
                v-for="cls in classrooms"
                :key="cls.id"
                :value="cls.id"
              >
                {{ cls.code }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter
        class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          class="flex-1 sm:flex-none"
          @click="resetAllFilters"
        >
          Atur Ulang
        </Button>
        <Button
          size="sm"
          class="flex-1 sm:flex-none"
          @click="isFilterDialogOpen = false"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ImportExportDialog
    v-if="canImport"
    v-model:open="isImportExportOpen"
    :is-processing="isImporting"
    :labels="studentImportExportLabels"
    @download-template="downloadTemplate"
    @export-data="exportData"
    @import-data="handleFileUpload"
  />

  <ImportPreviewDialog
    v-model:open="isConflictDialogOpen"
    :rows="conflictRows"
    :columns="studentImportColumns"
    :loading="isResolvingConflicts"
    :progress="resolveProgress"
    @resolve="handleResolveConflicts"
  />
</template>
