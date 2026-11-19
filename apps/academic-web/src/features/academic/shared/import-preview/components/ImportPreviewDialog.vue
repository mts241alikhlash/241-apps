<script setup lang="ts" generic="TData">
import { ref, watch, computed } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Button } from '@mts241alikhlash/ui/button'
import { Progress } from '@mts241alikhlash/ui/progress'
import { DataTable } from '@mts241alikhlash/ui'
import {
  Dialog,
  DialogBody,
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
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from '@lucide/vue'
import type { ImportColumnDescriptor, ImportPreviewRow } from '../types'
import { buildResolveDecisions } from '../logic/buildResolveDecisions'
import { buildImportColumns } from '../logic/buildImportColumns'

const props = defineProps<{
  rows: ImportPreviewRow<TData>[]
  columns: ImportColumnDescriptor[]
  loading: boolean
  progress?: number
}>()

const emit = defineEmits<{
  resolve: [decisions: ReturnType<typeof buildResolveDecisions<TData>>]
}>()

const open = defineModel<boolean>('open', { default: false })

const actions = ref<Record<number, 'update' | 'skip'>>({})

watch(
  () => props.rows,
  (rows) => {
    actions.value = Object.fromEntries(rows.map((r) => [r.row, 'update']))
  },
  { immediate: true },
)

function setAll(action: 'update' | 'skip') {
  const newActions = { ...actions.value }
  for (const row of props.rows) {
    newActions[row.row] = action
  }
  actions.value = newActions
}

const progress = computed(() => (props.loading ? (props.progress ?? 0) : 0))

const summary = computed(() => {
  const successRows = props.rows.filter((r) => r.status === 'SUCCESS').length
  const updateConflicts = props.rows.filter(
    (r) => r.status === 'CONFLICT' && actions.value[r.row] === 'update',
  ).length
  const willProcess = successRows + updateConflicts

  const failedRows = props.rows.filter((r) => r.status === 'FAILED').length
  const skipConflicts = props.rows.filter(
    (r) => r.status === 'CONFLICT' && actions.value[r.row] === 'skip',
  ).length

  return { willProcess, skipConflicts, failedRows }
})

function handleApply() {
  emit('resolve', buildResolveDecisions(props.rows, actions.value))
}

function handleOpenChange(val: boolean) {
  if (props.loading && !val) return
  open.value = val
}

const tableColumns = computed<ColumnDef<ImportPreviewRow<TData>>[]>(() =>
  buildImportColumns<TData>({
    descriptors: props.columns,
    actions: actions.value,
    loading: props.loading,
    onActionChange: (row, action) => {
      actions.value = { ...actions.value, [row]: action }
    },
  }),
)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="handleOpenChange"
  >
    <DialogContent
      class="w-[98vw] sm:max-w-[98vw] max-h-[95vh] p-0 flex flex-col overflow-hidden"
    >
      <DialogHeader standard>
        <DialogTitle>Pratinjau Impor</DialogTitle>
        <DialogDescription>
          Belum ada data yang disimpan. Periksa dulu, lalu klik
          <span class="font-medium text-foreground">Proses Impor</span> untuk
          menyimpannya.
        </DialogDescription>
      </DialogHeader>

      <DialogBody class="space-y-4">
        <DataTable
          :key="Object.values(actions).join('-')"
          :columns="tableColumns"
          :data="rows"
          :is-loading="loading"
          :page-size="rows.length || 10"
          max-height="400px"
          hide-pagination
          hide-per-page
        />
      </DialogBody>

      <div
        v-if="loading"
        class="px-6 pb-4 space-y-2 shrink-0"
        role="status"
        aria-live="polite"
      >
        <div class="flex items-center justify-between text-xs">
          <span class="flex items-center gap-2 font-medium">
            <Loader2 class="size-4 animate-spin" />
            Menyimpan {{ summary.willProcess }} baris...
          </span>
          <span class="text-muted-foreground">Jangan tutup jendela ini</span>
        </div>
        <Progress :model-value="progress" />
      </div>

      <DialogFooter
        standard
        class="flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div
          class="flex flex-wrap items-center gap-2 text-xs justify-center sm:justify-start"
        >
          <div
            class="flex items-center gap-1.5 px-3 min-h-[var(--control-h-md,2rem)] bg-success/10 border border-success/30 rounded-md text-foreground font-medium select-none"
          >
            <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
            <span>{{ summary.willProcess }} akan diproses</span>
          </div>
          <div
            class="flex items-center gap-1.5 px-3 min-h-[var(--control-h-md,2rem)] bg-warning/10 border border-warning/30 rounded-md text-foreground font-medium select-none"
          >
            <AlertTriangle class="h-4 w-4 text-warning shrink-0" />
            <span>{{ summary.skipConflicts }} akan dilewati</span>
          </div>
          <div
            class="flex items-center gap-1.5 px-3 min-h-[var(--control-h-md,2rem)] bg-destructive/10 border border-destructive/30 rounded-md text-foreground font-medium select-none"
          >
            <AlertCircle class="h-4 w-4 text-destructive shrink-0" />
            <span>{{ summary.failedRows }} gagal</span>
          </div>
        </div>

        <div
          class="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto"
        >
          <Button
            variant="outline"
            :disabled="loading"
            @click="handleOpenChange(false)"
          >
            Batal
          </Button>
          <div class="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                :disabled="loading"
                as-child
              >
                <Button
                  variant="outline"
                  class="gap-1.5"
                >
                  Pilihan Cepat
                  <ChevronDown class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="z-[60]"
              >
                <DropdownMenuItem @click="setAll('update')">
                  Perbarui Semua
                </DropdownMenuItem>
                <DropdownMenuItem @click="setAll('skip')">
                  Lewati Semua
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              :disabled="loading"
              @click="handleApply"
            >
              <Loader2
                v-if="loading"
                class="size-4 animate-spin"
              />
              {{ loading ? 'Memproses...' : 'Proses Impor' }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
