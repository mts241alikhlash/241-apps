<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { RefreshCw } from '@lucide/vue'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { permissionsApi } from '../api/permissionsApi'
import { getColumns } from '../components/permissionColumns'
import type { Permission } from '../types'

const permissions = ref<Permission[]>([])
const isLoading = ref(false)
const isSyncing = ref(false)

const fetchPermissions = async () => {
  isLoading.value = true
  try {
    const res = await permissionsApi.getPermissions()
    permissions.value = res.data?.data ?? []
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat data permission.'),
    )
  } finally {
    isLoading.value = false
  }
}

const handleSync = async () => {
  isSyncing.value = true
  try {
    await permissionsApi.syncPermissions()
    toast.success('Katalog permission tersinkron dengan definisi backend.')
    await fetchPermissions()
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal menyinkronkan permission.'),
    )
  } finally {
    isSyncing.value = false
  }
}

const columns = getColumns()

onMounted(() => {
  void fetchPermissions()
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
          <CardTitle size="lg"> Manajemen Permission </CardTitle>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="isSyncing"
            @click="handleSync"
          >
            <RefreshCw
              class="mr-2 h-4 w-4"
              :class="{ 'animate-spin': isSyncing }"
            />
            {{ isSyncing ? 'Menyinkronkan...' : 'Sinkronkan' }}
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="permissions"
          :is-loading="isLoading"
          item-label="permission"
        />
      </CardContent>
    </Card>
  </div>
</template>
