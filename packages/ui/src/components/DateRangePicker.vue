<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseDate } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { Calendar as CalendarIcon } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@mts241alikhlash/ui/popover'
import { RangeCalendar } from '@mts241alikhlash/ui/range-calendar'

export interface DateRangeValue {
  start: string
  end: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: DateRangeValue
    id?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue]
}>()

const isOpen = ref(false)

function parse(value: string) {
  try {
    return value ? parseDate(value.split('T')[0]) : undefined
  } catch {
    return undefined
  }
}

const calendarValue = computed<DateRange>(() => ({
  start: parse(props.modelValue.start),
  end: parse(props.modelValue.end),
}))

function format(value: string) {
  const date = parse(value)
  if (!date) return ''
  const [year, month, day] = date.toString().split('-')
  return `${day}/${month}/${year}`
}

const displayLabel = computed(() => {
  const start = format(props.modelValue.start)
  const end = format(props.modelValue.end)
  if (start && end) return `${start} – ${end}`
  return start || (props.placeholder ?? 'Pilih rentang tanggal')
})

const isEmpty = computed(() => !props.modelValue.start)

function onSelect(range: DateRange) {
  emit('update:modelValue', {
    start: range.start ? range.start.toString() : '',
    end: range.end ? range.end.toString() : '',
  })
  if (range.start && range.end) isOpen.value = false
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        v-bind="$attrs"
        :id="id"
        variant="outline"
        :disabled="disabled"
        :class="[
          'w-full justify-start border-input bg-transparent hover:bg-transparent aria-expanded:bg-transparent aria-expanded:border-ring aria-invalid:ring-0 focus-visible:ring-0 text-left font-normal h-[var(--control-h-md,1.75rem)]',
          isEmpty && 'text-muted-foreground',
        ]"
      >
        {{ displayLabel }}
        <CalendarIcon class="ml-auto size-[var(--icon-control,0.875rem)] shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-auto p-0"
      align="start"
    >
      <RangeCalendar
        :model-value="calendarValue"
        locale="id-ID"
        initial-focus
        @update:model-value="onSelect"
      />
    </PopoverContent>
  </Popover>
</template>
