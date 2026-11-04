<script setup lang="ts">
import { SearchInput } from '@mts241alikhlash/ui'
import { computed } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import type { Permission } from '../types'
import {
  usePermissionMatrix,
  translatePermission,
} from '../composables/usePermissionMatrix'

const props = defineProps<{
  permissions: Permission[]
  loading: boolean
}>()

const permissionIds = defineModel<string[]>({ required: true })

const {
  expandedGroups,
  searchQuery,
  filteredGroupedPermissions,
  totalFilteredPermissionsCount,
  toggleGroup,
  isAllModuleSelected,
  isSomeModuleSelected,
  toggleModuleAll,
  togglePermission,
  selectAll,
  deselectAll,
} = usePermissionMatrix(
  computed(() => props.permissions),
  permissionIds,
)
</script>

<template>
  <Card
    gap="none"
    class="overflow-hidden"
  >
    <CardHeader standard>
      <div class="flex items-center min-w-0">
        <CardTitle size="md"
          >Hak Akses - {{ permissionIds?.length ?? 0 }} Terpilih</CardTitle
        >
      </div>

      <div class="flex items-center gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 text-xs font-semibold text-primary border-primary/20 hover:bg-primary/10 hover:text-primary"
          @click="selectAll"
        >
          Pilih Semua
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          @click="deselectAll"
        >
          Batal Semua
        </Button>
      </div>
    </CardHeader>
    <CardContent
      variant="standard"
      class="space-y-4"
    >
      <SearchInput
        v-model="searchQuery"
        label="Cari modul atau hak akses"
        class="sm:w-full"
      />

      <div
        v-if="loading"
        class="flex flex-col items-center justify-center py-12 space-y-2"
      >
        <span class="text-sm text-muted-foreground animate-pulse"
          >Memuat daftar hak akses...</span
        >
      </div>

      <div
        v-else-if="permissions.length === 0"
        class="text-center py-12 text-muted-foreground text-sm"
      >
        Tidak ada data hak akses yang tersedia.
      </div>

      <div
        v-else-if="totalFilteredPermissionsCount === 0"
        class="text-center py-12 text-muted-foreground text-sm"
      >
        Tidak ada hak akses yang cocok dengan pencarian "{{ searchQuery }}".
      </div>

      <div
        v-else
        class="space-y-4 max-h-[500px] overflow-y-auto pr-1"
      >
        <div
          v-for="(modulePerms, moduleName) in filteredGroupedPermissions"
          :key="moduleName"
          class="border border-border/60 rounded-xl bg-card overflow-hidden shadow-xs transition-all duration-200"
          :class="{
            'border-primary/20 ring-1 ring-primary/5':
              expandedGroups[moduleName],
          }"
        >
          <div
            class="flex items-center justify-between px-4 py-3 bg-muted/10 border-b"
          >
            <div class="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <Checkbox
                :model-value="
                  isAllModuleSelected(modulePerms)
                    ? true
                    : isSomeModuleSelected(modulePerms)
                      ? 'indeterminate'
                      : false
                "
                class="shrink-0"
                @update:model-value="
                  (val: boolean | 'indeterminate') =>
                    toggleModuleAll(modulePerms, val)
                "
              />
              <span class="font-semibold text-sm select-none">{{
                moduleName
              }}</span>
              <span
                class="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold whitespace-nowrap shrink-0"
              >
                {{
                  modulePerms.filter((p) => permissionIds?.includes(p.id))
                    .length
                }}
                / {{ modulePerms.length }}
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 text-muted-foreground hover:text-foreground"
              @click="toggleGroup(moduleName)"
            >
              <ChevronUp
                v-if="expandedGroups[moduleName]"
                class="size-4"
              />
              <ChevronDown
                v-else
                class="size-4"
              />
            </Button>
          </div>

          <div
            v-show="expandedGroups[moduleName]"
            class="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-card/50"
          >
            <div
              v-for="perm in modulePerms"
              :key="perm.id"
              class="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
              @click="togglePermission(perm.id)"
            >
              <Checkbox
                :model-value="permissionIds?.includes(perm.id)"
                class="shrink-0"
                @click.stop
                @update:model-value="() => togglePermission(perm.id)"
              />
              <div class="select-none flex-1">
                <div class="text-xs font-semibold tracking-tight leading-none">
                  {{
                    translatePermission(
                      perm.code,
                      perm.description ?? undefined,
                    )
                  }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
