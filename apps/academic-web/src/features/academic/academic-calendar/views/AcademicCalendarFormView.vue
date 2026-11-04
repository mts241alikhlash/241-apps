<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useRoute } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { ref, onMounted } from 'vue'
import { useCalendarFormPage } from '../composables/useCalendarFormPage'
import { Button } from '@mts241alikhlash/ui/button'
import { FormControl, FormField, FloatingField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mts241alikhlash/ui/popover'
import { RangeCalendar } from '@mts241alikhlash/ui/range-calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@mts241alikhlash/ui/alert-dialog'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { cn } from '@mts241alikhlash/web-shared/utils/utils'
import { CalendarIcon } from '@lucide/vue'
import { academicCalendarTypeApi } from '@/features/academic/academic-calendar-type/api/academicCalendarTypeApi'

const route = useRoute()

const {
  eventTitle,
  isEditMode,
  isLoadingEvent,
  isSaving,
  isDeleting,
  dateRangeOpen,
  dateRangeValue,
  dateRangeLabel,
  onSubmit,
  onDelete,
  onCancel,
  handleRangeUpdate,
} = useCalendarFormPage()

const calendarTypes = ref<{ id: string; name: string }[]>([])

onMounted(async () => {
  try {
    const res = await academicCalendarTypeApi.getAcademicCalendarTypes({
      limit: PAGINATION.REFERENCE_LIMIT,
      isActive: true,
    })
    calendarTypes.value = res.data?.data ?? []
  } catch (error: unknown) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat tipe kalender akademik.'),
    )
  }
})

useBreadcrumbs(() => {
  const name = isEditMode.value ? eventTitle.value : null
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke manajemen kalender"
            @click="onCancel"
          />
          <div>
            <CardTitle size="lg">
              {{
                isEditMode ? 'Edit Agenda Kalender' : 'Tambah Agenda Kalender'
              }}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <div
        v-if="isLoadingEvent"
        class="p-6 flex flex-col items-center justify-center py-20 space-y-4"
      >
        <span class="text-sm text-muted-foreground animate-pulse"
          >Memuat data detail agenda...</span
        >
      </div>

      <form
        v-else
        class="flex flex-col"
        @submit="onSubmit"
      >
        <div class="p-6 md:p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FloatingField
              v-slot="{ componentField }"
              name="title"
              label="Nama Agenda"
            >
              <div class="md:col-span-2">
                <FormControl>
                  <Input v-bind="componentField" />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="typeId"
              label="Kategori Agenda"
            >
              <div class="content-start">
                <Select
                  :model-value="value"
                  @update:model-value="handleChange"
                >
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="ct in calendarTypes"
                      :key="ct.id"
                      :value="ct.id"
                    >
                      {{ ct.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FormField name="startDate">
              <FormItem class="flex flex-col justify-end">
                <FormLabel>Rentang Tanggal</FormLabel>
                <Popover v-model:open="dateRangeOpen">
                  <PopoverTrigger as-child>
                    <FormControl>
                      <Button
                        variant="outline"
                        :class="
                          cn(
                            'w-full justify-start text-left font-normal h-10',
                            !dateRangeLabel && 'text-muted-foreground',
                          )
                        "
                      >
                        <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
                        {{ dateRangeLabel || 'Pilih rentang tanggal' }}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    class="w-auto p-0"
                    align="start"
                  >
                    <RangeCalendar
                      :model-value="dateRangeValue"
                      locale="id-ID"
                      initial-focus
                      @update:model-value="handleRangeUpdate"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="endDate">
              <FormItem class="hidden">
                <FormMessage />
              </FormItem>
            </FormField>

            <FloatingField
              v-slot="{ componentField }"
              name="startTime"
              label="Jam Mulai (Opsional)"
              always-float
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="time"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="endTime"
              label="Jam Selesai (Opsional)"
              always-float
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    v-bind="componentField"
                    type="time"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="description"
              label="Deskripsi / Keterangan (Opsional)"
            >
              <div class="md:col-span-2">
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    class="resize-none min-h-[120px]"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t px-6 py-4 bg-background"
        >
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving || isDeleting"
            @click="onCancel"
          >
            Batal
          </Button>
          <div class="flex items-center gap-2">
            <AlertDialog v-if="isEditMode">
              <AlertDialogTrigger as-child>
                <Button
                  type="button"
                  variant="destructive"
                  :disabled="isSaving || isDeleting"
                >
                  {{ isDeleting ? 'Menghapus...' : 'Hapus' }}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Agenda kalender ini
                    akan dihapus secara permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    @click="onDelete"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="submit"
              :disabled="isSaving || isDeleting"
            >
              {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  </div>
</template>
