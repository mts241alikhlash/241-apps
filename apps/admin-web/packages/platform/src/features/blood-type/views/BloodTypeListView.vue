<script setup lang="ts">
import { ReferenceDataListView } from '@/reference-data'
import { useBloodTypeConfig } from '../config'

const config = useBloodTypeConfig()
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <ReferenceDataListView :config="config" />
  </div>
</template>
