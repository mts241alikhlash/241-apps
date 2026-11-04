<script setup lang="ts">
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { watchDebounced } from '@vueuse/core'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { createCredentialColumns } from '../components/credentialColumns'
import IssueCredentialDialog from '../components/IssueCredentialDialog.vue'
import { credentialService } from '../services/credentialService'
import { useCredentialStore } from '../stores/credentialStore'
import type { Credential } from '../types'

const store = useCredentialStore()
const issueOpen = ref(false)

async function handleRevoke(credential: Credential) {
  const reason = window.prompt(
    `Alasan pencabutan kartu "${credential.holder.displayName ?? credential.holder.identifier}" (mis. kartu hilang):`,
  )
  if (!reason) return
  await credentialService.revoke(credential.id, { reason })
}

const tableColumns = computed(() =>
  createCredentialColumns((item) => void handleRevoke(item)),
)

watchDebounced(
  () => store.search,
  () => {
    store.page = 1
    void credentialService.fetchCredentials()
  },
  { debounce: 300 },
)

watch(
  () => [store.page, store.limit],
  () => void credentialService.fetchCredentials(),
)

onMounted(() => void credentialService.fetchCredentials())
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
        <CardTitle size="lg"> Kartu Presensi </CardTitle>
        <Button @click="issueOpen = true">
          <Plus class="mr-2 h-4 w-4" />
          Terbitkan
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          v-model:page="store.page"
          v-model:page-size="store.limit"
          :columns="tableColumns"
          :data="store.items"
          :total-items="store.totalItems"
          :is-loading="store.loading"
          item-label="kartu presensi"
        >
          <template #header-right>
            <SearchInput
              v-model="store.search"
              label="Cari nama pemegang kartu"
            />
          </template>
        </DataTable>

        <IssueCredentialDialog v-model:open="issueOpen" />
      </CardContent>
    </Card>
  </div>
</template>
