<script setup lang="ts">
import { ReferenceDataListView } from '@/reference-data'
import { usePositionCategoryConfig } from '../config'

const config = usePositionCategoryConfig()
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <ReferenceDataListView :config="config" />
  </div>
</template>
