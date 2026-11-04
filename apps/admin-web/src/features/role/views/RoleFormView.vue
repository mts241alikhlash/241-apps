<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { BackButton } from '@mts241alikhlash/ui'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { rolesApi } from '../api/rolesApi'
import RoleForm from '../components/RoleForm.vue'
import { roleUsageWarning } from '../utils/roleUsage'
import type {
  Role,
  Permission,
  CreateRolePayload,
  UpdateRolePayload,
} from '../types'

const route = useRoute()
const router = useRouter()

const roleId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!roleId.value)

const permissions = ref<Permission[]>([])
const selectedRole = ref<Role | null>(null)
const usageWarning = ref<string | null>(null)

const isLoadingPermissions = ref(false)
const isLoadingRole = ref(false)
const isSaving = ref(false)
const formError = ref<string | null>(null)

const fetchPermissions = async () => {
  isLoadingPermissions.value = true
  try {
    const res = await rolesApi.getPermissions()
    permissions.value = res.data?.data ?? []
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat daftar hak akses.'),
    )
  } finally {
    isLoadingPermissions.value = false
  }
}

const fetchRoleDetails = async () => {
  if (!roleId.value) return
  isLoadingRole.value = true
  try {
    const res = await rolesApi.getRoleById(roleId.value)
    selectedRole.value = res.data?.data ?? null
    void fetchUsageWarning(selectedRole.value?.code)
  } catch (error) {
    toast.error(
      getIndonesianErrorMessage(error, 'Gagal memuat data detail role.'),
    )
    void router.push('/setting/role')
  } finally {
    isLoadingRole.value = false
  }
}

const fetchUsageWarning = async (code: string | undefined) => {
  if (!code) return
  try {
    const res = await rolesApi.getRoleUsage()
    usageWarning.value = roleUsageWarning(
      (res.data?.data ?? []).find((entry) => entry.roleCode === code),
    )
  } catch {
    usageWarning.value = null
  }
}

const handleSaveRole = async (
  payload: CreateRolePayload | UpdateRolePayload,
) => {
  isSaving.value = true
  formError.value = null
  try {
    if (isEditing.value && roleId.value) {
      await rolesApi.updateRole(roleId.value, payload)
      toast.success('Berhasil memperbarui data role')
    } else {
      await rolesApi.createRole(payload as CreateRolePayload)
      toast.success('Berhasil menambahkan role baru')
    }
    void router.push('/setting/role')
  } catch (error) {
    formError.value = getIndonesianErrorMessage(
      error,
      'Gagal menyimpan data role.',
    )
    toast.error(formError.value)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  void router.push('/setting/role')
}

onMounted(async () => {
  await fetchPermissions()
  if (isEditing.value) {
    await fetchRoleDetails()
  }
})

useBreadcrumbs(() => {
  const name = selectedRole.value?.name
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar role"
            @click="handleCancel"
          />
          <div>
            <CardTitle size="lg">
              {{ isEditing ? 'Ubah Hak Akses Role' : 'Tambah Role Baru' }}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <Alert
        v-if="usageWarning"
        class="mx-6 mt-4 w-auto"
      >
        <AlertDescription>{{ usageWarning }}</AlertDescription>
      </Alert>

      <div
        v-if="isLoadingRole"
        class="p-6 flex flex-col items-center justify-center py-20 space-y-4"
      >
        <span class="text-sm text-muted-foreground animate-pulse"
          >Memuat data detail role...</span
        >
      </div>

      <RoleForm
        v-else
        :edit-data="selectedRole"
        :is-saving="isSaving"
        :form-error="formError"
        :permissions="permissions"
        :is-loading-permissions="isLoadingPermissions"
        @save="handleSaveRole"
        @cancel="handleCancel"
      />
    </Card>
  </div>
</template>
