<script setup lang="ts">
import { ref, computed, type Component } from 'vue'
import { Edit2, Eye, Trash2, Settings2, UserCheck } from '@lucide/vue'
import { Button } from '@mts241alikhlash/ui/button'
import { cn } from '@mts241alikhlash/ui/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@mts241alikhlash/ui/tooltip'

const props = defineProps<{
  editLabel?: string
  editIcon?: 'edit' | 'eye'
  viewLabel?: string
  manageLabel?: string
  deleteLabel?: string
  deleteTitle?: string
  deleteDescription?: string
  hideEdit?: boolean
  hideDelete?: boolean
  items?: {
    label: string
    icon?: Component
    destructive?: boolean
    disabled?: boolean
    onClick: () => void
  }[]
}>()

const EditIcon = computed(() => (props.editIcon === 'eye' ? Eye : Edit2))

const emit = defineEmits<{
  edit: []
  view: []
  manage: []
  delete: [
    payload: { closeAlert: () => void; setLoading: (state: boolean) => void },
  ]
}>()

const isAlertOpen = ref(false)
const isDeleting = ref(false)

function fireEdit() {
  emit('edit')
}

function fireView() {
  emit('view')
}

function fireManage() {
  emit('manage')
}

function fireDelete() {
  isAlertOpen.value = true
}

function confirmDelete() {
  const closeAlert = () => {
    isAlertOpen.value = false
  }
  const setLoading = (state: boolean) => {
    isDeleting.value = state
  }
  emit('delete', { closeAlert, setLoading })
}
</script>

<template>
  <div class="relative flex justify-center items-center">
    <Tooltip :delay-duration="300">
      <TooltipTrigger as-child>
        <DropdownMenu :modal="false">
          <DropdownMenuTrigger
            class="size-[var(--control-h-md,1.75rem)] p-0 flex items-center justify-center data-[state=open]:bg-muted border-none text-muted-foreground hover:bg-muted focus:ring-0 shadow-none rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors [&_svg]:size-[var(--icon-control,0.875rem)]"
          >
            <span class="sr-only">Opsi</span>
            <Settings2 />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
          >
            <DropdownMenuItem
              v-if="viewLabel"
              class="cursor-pointer"
              @click="fireView"
            >
              <div class="flex items-center gap-2">
                <Eye  />
                <span>{{ viewLabel }}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="manageLabel"
              class="cursor-pointer"
              @click="fireManage"
            >
              <div class="flex items-center gap-2">
                <UserCheck  />
                <span>{{ manageLabel }}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              v-for="item in items"
              :key="item.label"
              :disabled="item.disabled"
              :class="
                cn(
                  'cursor-pointer',
                  item.destructive &&
                    'text-destructive focus:bg-destructive/10 focus:text-destructive',
                )
              "
              @click="item.onClick()"
            >
              <div class="flex items-center gap-2">
                <component
                  :is="item.icon"
                  v-if="item.icon"
                  :class="cn(item.destructive && 'text-destructive')"
                />
                <span>{{ item.label }}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="!hideEdit"
              class="cursor-pointer"
              @click="fireEdit"
            >
              <div class="flex items-center gap-2">
                <component
                  :is="EditIcon"
                  
                />
                <span>{{ editLabel || 'Edit' }}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              v-if="!hideDelete"
              class="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              @click="fireDelete"
            >
              <div class="flex items-center gap-2">
                <Trash2 class="text-destructive" />
                <span>{{ deleteLabel || 'Hapus' }}</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Pilihan Aksi</p>
      </TooltipContent>
    </Tooltip>

    <AlertDialog v-model:open="isAlertOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            deleteTitle || 'Apakah anda yakin?'
          }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ deleteDescription || 'Tindakan ini tidak dapat dibatalkan.' }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            :disabled="isDeleting"
            @click="isAlertOpen = false"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            {{ isDeleting ? 'Menghapus...' : deleteLabel || 'Hapus' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
