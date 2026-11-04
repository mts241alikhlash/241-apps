<script setup lang="ts">
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Loader2 } from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'
import type { useAcademicSetting } from '../composables/useAcademicSetting'

withDefaults(
  defineProps<{
    title: string
    setting: ReturnType<typeof useAcademicSetting>
    loadingText: string
    hideControls?: boolean
  }>(),
  { hideControls: false },
)

const { can } = useRoleGuard()
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-2.5">
          <CardTitle size="lg">
            {{ title }}
          </CardTitle>
          <Badge
            v-if="setting.isDirty.value"
            variant="outline"
            class="text-xs font-semibold text-amber-600 bg-amber-500/10 border-amber-500/30 dark:text-amber-400"
          >
            Belum disimpan
          </Badge>
        </div>

        <div
          v-if="!hideControls && can('academic-settings.update')"
          class="flex items-center gap-2 w-full sm:w-auto justify-end"
        >
          <Button
            v-if="setting.isDirty.value"
            type="button"
            variant="outline"
            size="sm"
            class=""
            :disabled="setting.isSaving.value"
            @click="setting.reset"
          >
            Batalkan
          </Button>
          <Button
            type="button"
            size="sm"
            class=""
            :disabled="
              !setting.isDirty.value ||
              !setting.isValid.value ||
              setting.isSaving.value
            "
            @click="setting.save"
          >
            <Loader2
              v-if="setting.isSaving.value"
              class="size-4 mr-1.5 animate-spin"
            />
            {{ setting.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
          </Button>
        </div>
      </CardHeader>

      <CardContent
        variant="standard"
        class="md:p-8 space-y-6"
      >
        <div
          v-if="setting.loading.value"
          class="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground"
        >
          <Loader2 class="size-6 animate-spin text-primary" />
          <span class="text-sm font-medium">{{ loadingText }}</span>
        </div>

        <Alert
          v-else-if="setting.loadError.value"
          variant="destructive"
        >
          <AlertDescription>{{ setting.loadError.value }}</AlertDescription>
        </Alert>

        <template v-else>
          <slot />

          <Alert
            v-if="setting.formError.value"
            variant="destructive"
          >
            <AlertDescription>{{ setting.formError.value }}</AlertDescription>
          </Alert>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
