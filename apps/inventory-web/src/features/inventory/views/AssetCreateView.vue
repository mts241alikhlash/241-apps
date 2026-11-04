<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { toast } from 'vue-sonner'
import type { InventoryMetadata, AssetSavePayload } from '../types'
import AssetForm from '../components/AssetForm.vue'
import { BackButton } from '@mts241alikhlash/ui'
import { inventoryReferenceService } from '../services/inventoryReferenceService'
import { assetService } from '../services/assetService'

const router = useRouter()
const isSaving = ref(false)
const metadata = ref<InventoryMetadata>({
  categories: [],
  locations: [],
  conditions: [],
  statuses: [],
  fundingSources: [],
})

async function loadMetadata() {
  try {
    const data = await inventoryReferenceService.fetchMetadata()
    if (data) {
      metadata.value = data
    }
  } catch {
    toast.error('Gagal memuat metadata referensi.')
  }
}

onMounted(() => {
  void loadMetadata()
})

async function handleSave(payload: AssetSavePayload) {
  isSaving.value = true
  const created = await assetService.create(payload)
  isSaving.value = false
  if (created) void router.push({ name: 'inventory-assets' })
}

function handleCancel() {
  void router.push({ name: 'inventory-assets' })
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar aset"
            @click="handleCancel"
          />
          <div>
            <CardTitle size="lg">Tambah Aset Baru</CardTitle>
            <p class="text-sm text-muted-foreground mt-1">
              Isi detail data aset logistik sekolah secara lengkap.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent variant="standard">
        <AssetForm
          :metadata="metadata"
          :is-saving="isSaving"
          @save="handleSave"
          @cancel="handleCancel"
        />
      </CardContent>
    </Card>
  </div>
</template>
