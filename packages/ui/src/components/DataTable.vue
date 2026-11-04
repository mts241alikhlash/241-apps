<script setup lang="ts" generic="TData extends object, TValue">
import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  SortingState,
  Row,
} from '@tanstack/vue-table'
import type { ColumnMetaAlign } from '@mts241alikhlash/web-shared/types/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { computed, ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Skeleton } from '@mts241alikhlash/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mts241alikhlash/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@mts241alikhlash/ui/pagination'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@lucide/vue'
import SearchInput from './SearchInput.vue'

const props = withDefaults(
  defineProps<{
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    totalItems?: number
    page?: number
    itemLabel?: string
    filterColumn?: string
    filterPlaceholder?: string
    hidePerPage?: boolean
    hidePagination?: boolean
    isLoading?: boolean
    pageSize?: number
    pinnedColumns?: { left?: string[]; right?: string[] }
    mobile?: 'table' | 'cards'
    rowClickable?: boolean
  }>(),
  {
    page: 1,
    pageSize: 10,
    mobile: 'table',
  },
)

const emit = defineEmits<{
  (e: 'selectionChange', rows: TData[]): void
  (e: 'update:page', page: number): void
  (e: 'update:page-size', pageSize: number): void
  (e: 'row-click', row: TData): void
}>()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const rowSelection = ref({})
const columnPinning = computed<ColumnPinningState>(
  () => props.pinnedColumns ?? { right: ['actions'] },
)

const pagination = ref({
  pageIndex: 0,
  pageSize: props.pageSize,
})

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getRowId: (row: TData, index: number) =>
    (row as { id?: string }).id ?? String(index),
  enableRowSelection: true,
  get manualPagination() {
    return props.totalItems !== undefined
  },
  get pageCount(): number | undefined {
    if (props.totalItems !== undefined) {
      return Math.ceil(props.totalItems / pagination.value.pageSize)
    }
    return undefined
  },
  onSortingChange: (updaterOrValue) => {
    sorting.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting.value)
        : updaterOrValue
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(columnFilters.value)
        : updaterOrValue
  },
  onPaginationChange: (updaterOrValue) => {
    pagination.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination.value)
        : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(rowSelection.value)
        : updaterOrValue
    setTimeout(() => {
      emit(
        'selectionChange',
        table.getSelectedRowModel().flatRows.map((r: Row<TData>) => r.original),
      )
    }, 0)
  },

  state: {
    get sorting() {
      return sorting.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get pagination() {
      return pagination.value
    },
    get rowSelection() {
      return rowSelection.value
    },
    get columnPinning() {
      return columnPinning.value
    },
  },
})

function pinClass(column: Column<TData, unknown>, part: 'header' | 'cell') {
  const side = column.getIsPinned()
  if (!side) return null
  const base = 'sticky z-10 bg-muted'
  if (side === 'right') {
    if (!column.getIsFirstColumn('right')) return base
    return part === 'header'
      ? `${base} border-l border-border shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.10)]`
      : `${base} border-l border-border shadow-[-6px_0_10px_-2px_rgba(0,0,0,0.15)]`
  }
  if (!column.getIsLastColumn('left')) return base
  return part === 'header'
    ? `${base} border-r border-border shadow-[4px_0_8px_-2px_rgba(0,0,0,0.10)]`
    : `${base} border-r border-border shadow-[6px_0_10px_-2px_rgba(0,0,0,0.15)]`
}

function pinStyle(column: Column<TData, unknown>) {
  const side = column.getIsPinned()
  if (!side) return undefined
  const offset =
    side === 'left'
      ? { left: `${column.getStart('left')}px` }
      : { right: `${column.getAfter('right')}px` }
  if (!props.pinnedColumns) return offset
  const size = `${column.getSize()}px`
  return { ...offset, width: size, minWidth: size }
}

const showFilterInput = computed(() => Boolean(props.filterColumn))
const filterColumnKey = computed(() => props.filterColumn ?? 'name')
const filterPlaceholder = computed(() => props.filterPlaceholder ?? 'Cari data')
const filterValue = computed(
  () =>
    (columnFilters.value.find((f) => f.id === filterColumnKey.value)
      ?.value as string) ?? '',
)
const totalItemCount = computed(() => props.totalItems ?? props.data.length)
const itemLabel = computed(() => props.itemLabel ?? 'data')

watch(
  () => props.page,
  (newPage) => {
    if (newPage !== undefined) {
      pagination.value = {
        ...pagination.value,
        pageIndex: newPage - 1,
      }
    }
  },
  { immediate: true },
)

watch(
  () => props.data.length,
  () => {
    if (props.totalItems === undefined) {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
    }
  },
)

watch(
  () => props.pageSize,
  (newSize) => {
    if (newSize !== undefined) {
      pagination.value = {
        ...pagination.value,
        pageSize: newSize,
      }
    }
  },
)

const setPage = (val: number) => {
  pagination.value = {
    ...pagination.value,
    pageIndex: val - 1,
  }
  emit('update:page', val)
}

const setPageSize = (size: number) => {
  pagination.value = {
    pageIndex: 0,
    pageSize: size,
  }
  emit('update:page-size', size)
}

interface MobileMeta {
  mobile?: 'hide' | 'title'
  mobileLabel?: string
  mobileValue?: (row: never) => string | number | null | undefined
  strong?: boolean
}

const MOBILE_SKIPPED = new Set(['select', 'no', 'actions'])

function mobileMeta(cell: Cell<TData, unknown>) {
  return (cell.column.columnDef.meta ?? {}) as MobileMeta
}

function cardParts(row: Row<TData>) {
  const cells = row.getVisibleCells()
  const usable = cells.filter(
    (cell) =>
      !MOBILE_SKIPPED.has(cell.column.id) && mobileMeta(cell).mobile !== 'hide',
  )
  const title =
    usable.find((cell) => mobileMeta(cell).mobile === 'title') ??
    usable.find((cell) => mobileMeta(cell).strong) ??
    usable[0]
  const rest = usable.filter((cell) => cell !== title)
  return {
    title,
    details: rest,
    actions: cells.find((cell) => cell.column.id === 'actions'),
    select: cells.find((cell) => cell.column.id === 'select'),
  }
}

function cellLabel(cell: Cell<TData, unknown>) {
  const label = mobileMeta(cell).mobileLabel
  if (label) return label
  const header = cell.column.columnDef.header
  return typeof header === 'string' ? header : cell.column.id
}

function cellText(cell: Cell<TData, unknown>): string | null {
  const read = mobileMeta(cell).mobileValue
  if (!read) return null
  const value = (read as (row: TData) => string | number | null | undefined)(
    cell.row.original,
  )
  return value === null || value === undefined || value === ''
    ? '-'
    : String(value)
}

function onCardKey(event: KeyboardEvent, row: Row<TData>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('row-click', row.original)
  }
}

const rangeText = computed(() => {
  const shown = table.getRowModel().rows.length
  if (shown === 0) return '0'
  const start = pagination.value.pageIndex * pagination.value.pageSize + 1
  return `${start}–${start + shown - 1}`
})

const countText = computed(() => {
  const total = totalItemCount.value
  const shown = table.getRowModel().rows.length
  if (shown === 0) return `0 ${itemLabel.value}`
  if (shown >= total) return `${total} ${itemLabel.value}`
  return `${rangeText.value} dari ${total} ${itemLabel.value}`
})

const pageNumber = computed(() => pagination.value.pageIndex + 1)
const pageTotal = computed(() => Math.max(table.getPageCount(), 1))

defineExpose({ table })
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div
      v-if="showFilterInput || $slots['header-left'] || $slots['header-right']"
      :class="[
        'w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        mobile === 'cards' ? 'hidden md:flex' : 'flex',
      ]"
    >
      <div
        v-if="$slots['header-left']"
        class="flex items-center gap-2"
      >
        <slot name="header-left" />
      </div>
      <div
        class="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end"
      >
        <slot name="header-right">
          <SearchInput
            v-if="showFilterInput"
            :label="filterPlaceholder"
            :model-value="filterValue"
            @update:model-value="
              table.getColumn(filterColumnKey)?.setFilterValue($event)
            "
          />
        </slot>
      </div>
    </div>

    <div
      v-if="
        mobile === 'cards' &&
        ($slots['header-left'] ||
          $slots['mobile-toolbar'] ||
          $slots['mobile-filter'] ||
          $slots['mobile-chips'])
      "
      class="flex flex-col gap-2 md:hidden"
    >
      <slot name="mobile-toolbar" />
      <div
        v-if="$slots['mobile-filter'] || $slots['header-left'] || !hidePerPage"
        class="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
      >
        <div class="flex items-center gap-2 justify-self-start">
          <slot name="header-left" />
        </div>
        <div class="flex items-center gap-2 justify-self-center">
          <slot name="mobile-filter" />
        </div>
        <div class="flex items-center gap-1.5 justify-self-end">
          <template v-if="!hidePerPage && !hidePagination">
            <Select
              :model-value="String(pagination.pageSize)"
              @update:model-value="(val) => setPageSize(Number(val))"
            >
              <SelectTrigger
                class="h-[var(--control-h-md,1.75rem)] data-[size=default]:h-[var(--control-h-md,1.75rem)] w-fit justify-center px-2.5 [&>svg]:hidden"
              >
                <SelectValue :placeholder="String(pagination.pageSize)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="size in [5, 10, 25, 50, 100]"
                  :key="size"
                  :value="String(size)"
                >
                  {{ size }}
                </SelectItem>
              </SelectContent>
            </Select>
            <span class="text-xs text-muted-foreground whitespace-nowrap"
              >baris</span
            >
          </template>
        </div>
      </div>
      <slot name="mobile-chips" />
    </div>

    <div
      :class="[
        'border rounded-md bg-background overflow-x-auto',
        mobile === 'cards' && 'hidden md:block',
      ]"
    >
      <Table>
        <TableHeader>
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="bg-muted/50 hover:bg-muted/50"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="px-4 text-center"
              :style="pinStyle(header.column)"
              :class="[
                pinClass(header.column, 'header'),
                {
                  'w-[1%] whitespace-nowrap text-center':
                    header.column.id === 'actions',
                  'w-[50px] px-4 text-center': ['no', 'select'].includes(
                    header.column.id,
                  ),
                  'text-center':
                    (header.column.columnDef.meta as ColumnMetaAlign)?.align ===
                    'center',
                  'text-right':
                    (header.column.columnDef.meta as ColumnMetaAlign)?.align ===
                    'right',
                  'text-left':
                    (header.column.columnDef.meta as ColumnMetaAlign)?.align ===
                    'left',
                },
              ]"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow
              v-for="i in 5"
              :key="i"
            >
              <TableCell
                v-for="j in columns.length"
                :key="j"
                class="px-4 py-2.5"
              >
                <Skeleton class="h-5 w-full" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-4 py-1"
                :style="pinStyle(cell.column)"
                :class="[
                  pinClass(cell.column, 'cell'),
                  {
                    'w-[1%] whitespace-nowrap text-center':
                      cell.column.id === 'actions',
                    'w-[50px] px-4 text-center': ['no', 'select'].includes(
                      cell.column.id,
                    ),
                    'text-center':
                      (cell.column.columnDef.meta as ColumnMetaAlign)?.align ===
                      'center',
                    'text-right':
                      (cell.column.columnDef.meta as ColumnMetaAlign)?.align ===
                      'right',
                    'text-left':
                      (cell.column.columnDef.meta as ColumnMetaAlign)?.align ===
                      'left',
                    'font-medium': (
                      cell.column.columnDef.meta as { strong?: boolean }
                    )?.strong,
                  },
                ]"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell
                :colspan="columns.length"
                class="h-24 text-center"
              >
                Tidak ada data.
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div
      v-if="mobile === 'cards'"
      data-slot="data-table-cards"
      class="md:hidden"
    >
      <div
        v-if="isLoading"
        class="divide-y rounded-md border bg-background"
      >
        <div
          v-for="i in 4"
          :key="i"
          class="space-y-1.5 px-3 py-2.5"
        >
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </div>
      <ul
        v-else-if="table.getRowModel().rows.length"
        class="divide-y rounded-md border bg-background"
      >
        <li
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          class="flex min-w-0 items-start"
        >
          <div
            v-if="cardParts(row).select"
            class="shrink-0 py-2 pl-3"
          >
            <FlexRender
              :render="cardParts(row).select!.column.columnDef.cell"
              :props="cardParts(row).select!.getContext()"
            />
          </div>
          <div
            :role="rowClickable ? 'link' : undefined"
            :tabindex="rowClickable ? 0 : undefined"
            :class="[
              'min-w-0 flex-1 space-y-0.5 px-3 py-2',
              rowClickable &&
                'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            ]"
            @click="rowClickable && emit('row-click', row.original)"
            @keydown="rowClickable && onCardKey($event, row)"
          >
            <div
              v-if="cardParts(row).title"
              class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-medium"
            >
              <span class="min-w-0 break-words">
                <FlexRender
                  :render="cardParts(row).title!.column.columnDef.cell"
                  :props="cardParts(row).title!.getContext()"
                />
              </span>
            </div>
            <dl
              v-if="cardParts(row).details.length"
              class="grid grid-cols-[max-content_auto_minmax(0,1fr)] gap-x-1.5 gap-y-0.5 text-[length:var(--text-control,0.75rem)]"
            >
              <template
                v-for="detail in cardParts(row).details"
                :key="detail.id"
              >
                <dt class="text-muted-foreground">{{ cellLabel(detail) }}</dt>
                <span
                  class="text-muted-foreground"
                  aria-hidden="true"
                  >:</span
                >
                <dd class="min-w-0 break-words">
                  <template v-if="cellText(detail) !== null">{{
                    cellText(detail)
                  }}</template>
                  <FlexRender
                    v-else
                    :render="detail.column.columnDef.cell"
                    :props="detail.getContext()"
                  />
                </dd>
              </template>
            </dl>
          </div>
          <div
            v-if="cardParts(row).actions"
            class="shrink-0 py-1.5 pr-2"
          >
            <FlexRender
              :render="cardParts(row).actions!.column.columnDef.cell"
              :props="cardParts(row).actions!.getContext()"
            />
          </div>
        </li>
      </ul>
      <div
        v-else
        class="rounded-md border p-4 text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
      >
        <slot name="empty">Tidak ada data.</slot>
      </div>
      <div
        v-if="!hidePagination && totalItemCount > 0"
        class="mt-2.5 flex items-center justify-between gap-2"
      >
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ countText }}
        </p>
        <div
          v-if="pageTotal > 1"
          class="flex items-center gap-1"
        >
          <Button
            variant="outline"
            size="icon"
            aria-label="Halaman sebelumnya"
            :disabled="pageNumber <= 1"
            @click="setPage(pageNumber - 1)"
          >
            <ChevronLeft />
          </Button>
          <span
            class="px-1 text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            {{ pageNumber }} / {{ pageTotal }}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Halaman berikutnya"
            :disabled="pageNumber >= pageTotal"
            @click="setPage(pageNumber + 1)"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="!hidePagination"
      :class="[
        'grid-cols-1 items-center gap-3 px-2 lg:grid-cols-[1fr_auto_1fr]',
        mobile === 'cards' ? 'hidden md:grid' : 'grid',
      ]"
    >
      <div
        v-if="!hidePerPage"
        class="flex items-center justify-center gap-2 shrink-0 lg:col-start-1 lg:row-start-1 lg:justify-start"
      >
        <Select
          :model-value="String(pagination.pageSize)"
          @update:model-value="(val) => setPageSize(Number(val))"
        >
          <SelectTrigger
            class="h-[var(--control-h-md,1.75rem)] data-[size=default]:h-[var(--control-h-md,1.75rem)] w-fit justify-center px-2.5 [&>svg]:hidden"
          >
            <SelectValue :placeholder="String(pagination.pageSize)" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem
              v-for="size in [5, 10, 25, 50, 100]"
              :key="size"
              :value="String(size)"
            >
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
        <span class="text-xs text-muted-foreground whitespace-nowrap"
          >baris per halaman</span
        >
      </div>
      <div
        class="text-center lg:col-start-3 lg:row-start-1 lg:text-right text-[length:var(--text-control,0.75rem)] text-muted-foreground"
      >
        Menampilkan {{ countText }}
      </div>
      <div
        class="order-first flex justify-center lg:order-none lg:col-start-2 lg:row-start-1"
      >
        <Pagination
          v-if="table.getPageCount() > 1"
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="totalItemCount"
          :sibling-count="1"
          :show-edges="false"
          class="mx-0 w-auto"
          @update:page="setPage"
        >
          <PaginationContent
            v-slot="{ items }"
            class="flex items-center gap-1"
          >
            <PaginationFirst
              size="icon"
              class="size-[var(--control-h-md,1.75rem)] p-0 sm:px-0"
            >
              <ChevronsLeft class="size-[var(--icon-control,0.875rem)]" />
            </PaginationFirst>
            <PaginationPrevious
              size="icon"
              class="size-[var(--control-h-md,1.75rem)] p-0 sm:px-0"
            >
              <ChevronLeft class="size-[var(--icon-control,0.875rem)]" />
            </PaginationPrevious>

            <template
              v-for="(item, index) in items"
              :key="index"
            >
              <PaginationItem
                v-if="item.type === 'page'"
                :value="item.value"
                :is-active="item.value === pagination.pageIndex + 1"
                class="size-[var(--control-h-md,1.75rem)]"
              >
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis
                v-else
                :index="index"
                class="size-[var(--control-h-md,1.75rem)]"
              />
            </template>

            <PaginationNext
              size="icon"
              class="size-[var(--control-h-md,1.75rem)] p-0 sm:px-0"
            >
              <ChevronRight class="size-[var(--icon-control,0.875rem)]" />
            </PaginationNext>
            <PaginationLast
              size="icon"
              class="size-[var(--control-h-md,1.75rem)] p-0 sm:px-0"
            >
              <ChevronsRight class="size-[var(--icon-control,0.875rem)]" />
            </PaginationLast>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  </div>
</template>
