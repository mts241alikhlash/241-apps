<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { rolesApi } from '../api/rolesApi'
import { getColumns } from '../components/roleColumns'
import type { Role, RoleUsage } from '../types'

const router = useRouter()

const roles = ref<Role[]>([])
const usage = ref<RoleUsage[]>([])
const isLoading = ref(false)

const fetchUsage = async () => {
  try {
    const res = await rolesApi.getRoleUsage()
    usage.value = res.data?.data ?? []
  } catch {
    usage.value = []
  }
}

const fetchRoles = async () => {
  isLoading.value = true
  try {
    const [res] = await Promise.all([rolesApi.getRoles(), fetchUsage()])
    roles.value = res.data?.data ?? []
  } catch (error) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data role.'))
  } finally {
    isLoading.value = false
  }
}

const handleAddClick = () => {
  void router.push('/setting/role/create')
}

const handleEditClick = (role: Role) => {
  void router.push(`/setting/role/${role.id}/edit`)
}

const handleDeleteRole = async (
  role: Role,
  {
    closeAlert,
    setLoading,
  }: { closeAlert: () => void; setLoading: (state: boolean) => void },
) => {
  setLoading(true)
  try {
    await rolesApi.deleteRole(role.id)
    toast.success('Berhasil menghapus role')
    closeAlert()
    await fetchRoles()
  } catch (error) {
    toast.error(getIndonesianErrorMessage(error, 'Gagal menghapus role.'))
  } finally {
    setLoading(false)
  }
}

const columns = getColumns(
  handleEditClick,
  (role, payload) => {
    void handleDeleteRole(role, payload)
  },
  (code) => usage.value.find((entry) => entry.roleCode === code),
)

onMounted(() => {
  void fetchRoles()
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
          <CardTitle size="lg"> Manajemen Role & Hak Akses </CardTitle>
        </div>
        <div class="flex gap-2">
          <Button @click="handleAddClick">
            <Plus class="mr-2 h-4 w-4" /> Tambah Role
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="roles"
          :is-loading="isLoading"
          item-label="role"
        />
      </CardContent>
    </Card>
  </div>
</template>
