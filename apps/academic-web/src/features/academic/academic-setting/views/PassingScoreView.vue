<script setup lang="ts">
import { onMounted } from 'vue'
import { useAcademicSetting } from '../composables/useAcademicSetting'
import AcademicSettingCard from '../components/AcademicSettingCard.vue'
import PassingScoreSection from '../components/PassingScoreSection.vue'
import { useRoleGuard } from '@/features/platform/auth'

const setting = useAcademicSetting()
const { can } = useRoleGuard()

onMounted(() => {
  void setting.fetch()
})
</script>

<template>
  <AcademicSettingCard
    title="Nilai Ketuntasan Minimum (KKM)"
    :setting="setting"
    loading-text="Memuat nilai ketuntasan minimum..."
  >
    <PassingScoreSection
      :score="setting.draftPassingScore.value"
      :is-saving="setting.isSaving.value"
      :can-edit="can('academic-settings.update')"
      @update="setting.setPassingScore"
    />
  </AcademicSettingCard>
</template>
