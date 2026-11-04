<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import {
  parseDate,
  getLocalTimeZone,
  today,
  CalendarDate,
  type DateValue,
} from '@internationalized/date'
import { Calendar as CalendarIcon } from '@lucide/vue'
import { Calendar } from '@mts241alikhlash/ui/calendar'
import { Button } from '@mts241alikhlash/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@mts241alikhlash/ui/popover'

const props = withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    placeholder?: string
    allowFutureDates?: boolean
    disabled?: boolean
    minDate?: string
    maxDate?: string
  }>(),
  {
    allowFutureDates: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)

const calendarValue = computed(() => {
  if (!props.modelValue) return undefined
  try {
    return parseDate(props.modelValue)
  } catch {
    return undefined
  }
})

const shownMonth = shallowRef<DateValue>(
  calendarValue.value ?? today(getLocalTimeZone()),
)

watch(isOpen, (open) => {
  if (open) {
    shownMonth.value = calendarValue.value ?? today(getLocalTimeZone())
  }
})

const displayLabel = computed(() => {
  if (!props.modelValue) return props.placeholder ?? 'Pilih tanggal'
  const [year, month, day] = props.modelValue.split('-')
  return `${day}/${month}/${year}`
})

const minCalendarValue = computed(() => {
  if (props.minDate) {
    try {
      return parseDate(props.minDate)
    } catch {
      return undefined
    }
  }
  const currentYear = today(getLocalTimeZone()).year
  const minYear = Math.floor((currentYear - 24) / 12) * 12
  return new CalendarDate(minYear, 1, 1)
})

const maxCalendarValue = computed(() => {
  if (props.maxDate) {
    try {
      return parseDate(props.maxDate)
    } catch {
      return undefined
    }
  }
  if (props.allowFutureDates) {
    const currentYear = today(getLocalTimeZone()).year
    const maxYear = Math.floor((currentYear + 24) / 12) * 12 + 11
    return new CalendarDate(maxYear, 12, 31)
  }
  return today(getLocalTimeZone())
})

function onSelect(date: CalendarDate | undefined) {
  if (!date) return
  emit('update:modelValue', date.toString())
  isOpen.value = false
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <Button
        :id="id"
        variant="outline"
        :disabled="disabled"
        :class="[
          'w-full justify-start border-input bg-transparent hover:bg-transparent aria-expanded:bg-transparent aria-expanded:border-ring aria-invalid:ring-0 focus-visible:ring-0 text-left font-normal h-[var(--control-h-md,1.75rem)]',
          !modelValue && 'text-muted-foreground',
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
      <Calendar
        v-model:placeholder="shownMonth"
        layout="month-and-year"
        :model-value="calendarValue"
        :min-value="minCalendarValue"
        :max-value="maxCalendarValue"
        @update:model-value="onSelect($event as CalendarDate)"
      />
    </PopoverContent>
  </Popover>
</template>
