<script setup lang="ts">
import { SearchInput } from '@mts241alikhlash/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import { Input } from '@mts241alikhlash/ui/input'
import { Button } from '@mts241alikhlash/ui/button'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import { Loader2, Save, Users } from '@lucide/vue'
import { computed, ref } from 'vue'
import type { StudentScoreRosterItem } from '../types'

const props = defineProps<{
  rows: StudentScoreRosterItem[]
  loading: boolean
  isSaving: boolean
  maxScore: number
  canSave?: boolean
}>()

const emit = defineEmits<{
  'update:rows': [value: StudentScoreRosterItem[]]
  save: []
}>()

function updateRowScore(index: number, value: string) {
  const row = props.rows[index]
  if (!row) return

  let score: number | null = null
  if (value !== '') {
    const parsed = Number(value)
    score = Number.isNaN(parsed)
      ? null
      : Math.min(Math.max(parsed, 0), props.maxScore)
  }

  const updated = [...props.rows]
  updated[index] = { ...row, score }
  emit('update:rows', updated)
}

const searchQuery = ref('')

const visibleRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const withIndex = props.rows.map((row, index) => ({ row, index }))
  if (!query) return withIndex

  return withIndex.filter(
    ({ row }) =>
      row.studentName.toLowerCase().includes(query) ||
      row.nis.toLowerCase().includes(query),
  )
})

const scoredCount = computed(
  () => props.rows.filter((row) => row.score !== null).length,
)

function updateRowNote(index: number, note: string) {
  const row = props.rows[index]
  if (!row) return
  const updated = [...props.rows]
  updated[index] = { ...row, note }
  emit('update:rows', updated)
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p class="text-sm text-muted-foreground text-center sm:text-left">
        <strong class="text-foreground tabular-nums">{{ scoredCount }}</strong>
        dari
        <strong class="text-foreground tabular-nums">{{ rows.length }}</strong>
        siswa sudah dinilai
      </p>
      <SearchInput
        v-model="searchQuery"
        label="Cari nama / NIS"
        :disabled="rows.length === 0"
        class="sm:ml-auto"
      />
    </div>

    <div class="border rounded-md bg-background overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/50 hover:bg-muted/50">
            <TableHead class="hidden sm:table-cell w-28 px-4 text-center"
              >NIS</TableHead
            >
            <TableHead class="px-4">Nama Siswa</TableHead>
            <TableHead class="w-1/3 sm:w-32 px-4 text-center">Nilai</TableHead>
            <TableHead class="hidden sm:table-cell w-56 px-4"
              >Catatan</TableHead
            >
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow
              v-for="i in 5"
              :key="`skeleton-${i}`"
            >
              <TableCell class="hidden sm:table-cell px-4 py-2.5">
                <Skeleton class="h-5 w-full" />
              </TableCell>
              <TableCell class="px-4 py-2.5">
                <Skeleton class="h-5 w-full" />
              </TableCell>
              <TableCell class="px-4 py-2.5">
                <Skeleton class="h-5 w-full" />
              </TableCell>
              <TableCell class="hidden sm:table-cell px-4 py-2.5">
                <Skeleton class="h-5 w-full" />
              </TableCell>
            </TableRow>
          </template>

          <TableRow
            v-for="{ row, index } in visibleRows"
            v-else
            :key="row.enrollmentId"
            class="transition-colors hover:bg-muted/30"
          >
            <TableCell
              class="hidden sm:table-cell px-4 py-2.5 text-center tabular-nums"
            >
              {{ row.nis }}
            </TableCell>
            <TableCell class="px-4 py-2.5">{{ row.studentName }}</TableCell>
            <TableCell class="px-4 py-2.5">
              <Input
                type="number"
                min="0"
                :max="maxScore"
                :model-value="row.score ?? ''"
                :placeholder="`0 - ${maxScore}`"
                class="min-w-[80px] text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                @update:model-value="
                  (val) => updateRowScore(index, String(val))
                "
              />
            </TableCell>
            <TableCell class="hidden sm:table-cell px-4 py-2.5">
              <Input
                :model-value="row.note ?? ''"
                placeholder="Catatan..."
                class=""
                @update:model-value="
                  (val) => updateRowNote(index, val as string)
                "
              />
            </TableCell>
          </TableRow>

          <TableRow v-if="!loading && visibleRows.length === 0">
            <TableCell
              :colspan="4"
              class="h-32 px-4 text-center"
            >
              <div
                class="flex flex-col items-center gap-2 text-muted-foreground"
              >
                <Users class="size-8 opacity-40" />
                <p class="text-sm font-medium text-foreground">
                  {{
                    rows.length === 0
                      ? 'Tidak ada siswa terdaftar'
                      : 'Tidak ada siswa yang cocok'
                  }}
                </p>
                <p class="text-xs">
                  {{
                    rows.length === 0
                      ? 'Kelas ini belum punya siswa aktif di semester berjalan.'
                      : 'Coba ubah kata pencarian.'
                  }}
                </p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div
      v-if="rows.length > 0 && canSave !== false"
      class="flex justify-end"
    >
      <Button
        :disabled="isSaving"
        @click="$emit('save')"
      >
        <Loader2
          v-if="isSaving"
          class="size-4 mr-2 animate-spin"
        />
        <Save
          v-else
          class="size-4 mr-2"
        />
        {{ isSaving ? 'Menyimpan...' : 'Simpan Semua' }}
      </Button>
    </div>
  </div>
</template>
