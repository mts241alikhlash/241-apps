<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SchoolUnitDetailCard from '../components/SchoolUnitDetailCard.vue'
import { useSchoolUnit } from '../composables/useSchoolUnit'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import { PencilLine } from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'

const router = useRouter()
const { can } = useRoleGuard()

const {
  schoolUnit,
  address,
  isLoading,
  loadError,
  isNotSetUp,
  loadSchoolUnitData,
} = useSchoolUnit()

onMounted(() => {
  void loadSchoolUnitData()
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div>
          <CardTitle size="lg"> Profil Sekolah </CardTitle>
        </div>
        <Button
          v-if="can('school-units.create')"
          :disabled="isLoading || (Boolean(loadError) && !isNotSetUp)"
          @click="router.push('/school-unit/edit')"
        >
          <PencilLine class="size-4 mr-2" />
          Ubah Data
        </Button>
      </CardHeader>

      <SchoolUnitDetailCard
        :school-unit="schoolUnit"
        :address="address"
        :is-loading="isLoading"
        :load-error="loadError"
      />
    </Card>
  </div>
</template>
