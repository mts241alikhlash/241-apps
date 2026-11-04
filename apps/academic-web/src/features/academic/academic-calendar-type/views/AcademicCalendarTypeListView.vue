<script setup lang="ts">
import { ReferenceDataListView } from '@/reference-data'
import { useAcademicCalendarTypeConfig } from '../config'

const config = useAcademicCalendarTypeConfig()
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <ReferenceDataListView :config="config" />
  </div>
</template>
