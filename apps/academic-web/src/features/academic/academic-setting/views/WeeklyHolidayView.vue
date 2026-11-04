<script setup lang="ts">
import { onMounted } from 'vue'
import { useAcademicSetting } from '../composables/useAcademicSetting'
import AcademicSettingCard from '../components/AcademicSettingCard.vue'
import WeeklyHolidaysSection from '../components/WeeklyHolidaysSection.vue'
import { useRoleGuard } from '@/features/platform/auth'

const setting = useAcademicSetting()
const { can } = useRoleGuard()

onMounted(() => {
  void setting.fetch()
})
</script>

<template>
  <AcademicSettingCard
    title="Hari Libur Mingguan"
    :setting="setting"
    loading-text="Memuat hari libur mingguan..."
    hide-controls
  >
    <WeeklyHolidaysSection
      :draft="setting.draftHolidays.value"
      :is-saving="setting.isSaving.value"
      :can-edit="can('academic-settings.update')"
      @toggle="setting.toggleHoliday"
      @save="setting.save"
      @reset="setting.reset"
    />
  </AcademicSettingCard>
</template>
