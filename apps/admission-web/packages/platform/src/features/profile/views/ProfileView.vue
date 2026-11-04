<script setup lang="ts">
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { useRouter, useRoute } from 'vue-router'
import { BackButton } from '@mts241alikhlash/ui'
import { onMounted, computed, unref, ref } from 'vue'
import { Card } from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mts241alikhlash/ui/tabs'
import { Button } from '@mts241alikhlash/ui/button'
import { Camera, Loader2, Trash2 } from '@lucide/vue'
import { Avatar, AvatarImage, AvatarFallback } from '@mts241alikhlash/ui/avatar'

import PersonalInfoTab from '../components/PersonalInfoTab.vue'
import SchoolIdentityCard from '../components/SchoolIdentityCard.vue'
import { EditAddressDialog } from '@/features/platform/address'
import AddressInfoTab from '@/features/platform/address/components/AddressInfoTab.vue'
import ChangePasswordSection from '../components/ChangePasswordSection.vue'

import { useProfileView } from '../composables/useProfileView'
import { profileConfig } from '../config'

const route = useRoute()

const router = useRouter()

const {
  activeTab,
  showEditAddress,
  loading,
  profileData,
  rawProfile,
  isAdmin,
  isEditable,
  initials,
  profileSubtitle,
  avatarUrl,
  isOwnProfile,
  isUploadingPhoto,
  getUserId,
  actionConfig,
  reloadProfile,
  handleActionClick,
  handlePhotoChange,
  handlePhotoDelete,
} = useProfileView()

const photoInput = ref<HTMLInputElement | null>(null)

async function onPhotoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await handlePhotoChange(file)
}

const activeTabLabel = computed(() => {
  if (activeTab.value === 'personal') return 'Data Diri'
  if (activeTab.value === 'address') return 'Alamat'
  if (activeTab.value === 'security') return 'Keamanan'

  const extraTab = profileConfig.value.extraTabs.find(
    (tab) => tab.value === activeTab.value,
  )
  return extraTab ? extraTab.label : 'Profil Pengguna'
})

onMounted(() => {
  reloadProfile()
})

useBreadcrumbs(() => {
  const name = isOwnProfile.value ? null : profileData.value?.fullName
  if (!name) return null
  const trail = route.meta.breadcrumbs ?? []
  return [...trail.slice(0, -1), { title: name }]
})
</script>

<template>
  <div class="p-4 md:p-6 lg:p-8">
    <div
      v-if="loading"
      class="flex items-center justify-center min-h-[500px] rounded-2xl bg-card shadow-sm shadow-black/5 ring-1 ring-black/4"
    >
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
        <p class="text-sm text-muted-foreground">Memuat data profil...</p>
      </div>
    </div>

    <Card
      v-else-if="profileData"
      class="overflow-hidden rounded-2xl shadow-sm shadow-black/5 ring-1 ring-black/4 bg-card border-none"
    >
      <Tabs
        v-model="activeTab"
        class="w-full"
        variant="line"
      >
        <div class="grid grid-cols-1 lg:grid-cols-4">
          <div
            class="lg:col-span-1 p-6 lg:border-r border-border/60 flex flex-col gap-6"
          >
            <BackButton
              v-if="!isOwnProfile"
              label="Kembali ke halaman sebelumnya"
              class="self-start"
              @click="router.back()"
            />
            <div class="flex flex-col items-center text-center shrink-0">
              <div class="relative shrink-0 mb-4">
                <Avatar class="size-24 border-2 border-primary/20">
                  <AvatarImage
                    v-if="avatarUrl"
                    :src="avatarUrl"
                    :alt="profileData.fullName"
                  />
                  <AvatarFallback
                    class="bg-primary/10 text-2xl font-bold text-primary"
                  >
                    {{ initials }}
                  </AvatarFallback>
                </Avatar>

                <template v-if="isOwnProfile">
                  <input
                    ref="photoInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    class="hidden"
                    @change="onPhotoPicked"
                  />
                  <button
                    type="button"
                    :title="avatarUrl ? 'Ganti foto' : 'Unggah foto'"
                    :disabled="isUploadingPhoto"
                    class="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    @click="photoInput?.click()"
                  >
                    <Loader2
                      v-if="isUploadingPhoto"
                      class="size-4 animate-spin"
                    />
                    <Camera
                      v-else
                      class="size-4"
                    />
                  </button>
                  <button
                    v-if="avatarUrl && !isUploadingPhoto"
                    type="button"
                    title="Hapus foto"
                    class="absolute -bottom-1 -left-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer"
                    @click="handlePhotoDelete"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </template>
              </div>

              <h2 class="text-xl font-bold text-foreground line-clamp-2">
                {{ profileData.fullName || '-' }}
              </h2>
              <p class="text-xs font-medium text-muted-foreground mt-1">
                {{ profileSubtitle }}
              </p>
            </div>

            <div class="lg:hidden w-full shrink-0">
              <Select v-model="activeTab">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Pilih Tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="personal"> Data Diri </SelectItem>
                    <template
                      v-for="tab in profileConfig.extraTabs"
                      :key="tab.value"
                    >
                      <SelectItem
                        v-if="!tab.show || tab.show(profileData.roles ?? [])"
                        :value="tab.value"
                      >
                        {{ tab.label }}
                      </SelectItem>
                    </template>
                    <SelectItem value="address"> Alamat </SelectItem>
                    <SelectItem value="security"> Keamanan </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <TabsList
              class="hidden lg:flex flex-col gap-1 w-full bg-transparent border-0 h-auto p-0 select-none items-stretch justify-start"
            >
              <TabsTrigger
                value="personal"
                class="justify-start px-3 py-2 h-9 text-left w-full border-0 rounded-md bg-transparent text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:font-medium data-[state=active]:text-sidebar-accent-foreground shadow-none data-[state=active]:shadow-none transition-all duration-200 cursor-pointer"
              >
                Data Diri
              </TabsTrigger>
              <template
                v-for="tab in profileConfig.extraTabs"
                :key="tab.value"
              >
                <TabsTrigger
                  v-if="!tab.show || tab.show(profileData.roles ?? [])"
                  :value="tab.value"
                  class="justify-start px-3 py-2 h-9 text-left w-full border-0 rounded-md bg-transparent text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:font-medium data-[state=active]:text-sidebar-accent-foreground shadow-none data-[state=active]:shadow-none transition-all duration-200 cursor-pointer"
                >
                  {{ tab.label }}
                </TabsTrigger>
              </template>
              <TabsTrigger
                value="address"
                class="justify-start px-3 py-2 h-9 text-left w-full border-0 rounded-md bg-transparent text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:font-medium data-[state=active]:text-sidebar-accent-foreground shadow-none data-[state=active]:shadow-none transition-all duration-200 cursor-pointer"
              >
                Alamat
              </TabsTrigger>
              <TabsTrigger
                value="security"
                class="justify-start px-3 py-2 h-9 text-left w-full border-0 rounded-md bg-transparent text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=active]:bg-sidebar-accent data-[state=active]:font-medium data-[state=active]:text-sidebar-accent-foreground shadow-none data-[state=active]:shadow-none transition-all duration-200 cursor-pointer"
              >
                Keamanan
              </TabsTrigger>
            </TabsList>
          </div>

          <div class="lg:col-span-3 flex flex-col">
            <div
              class="px-6 py-3.5 border-b border-border/60 shrink-0 flex items-center justify-between"
            >
              <h3 class="text-lg font-bold tracking-tight text-foreground">
                {{ activeTabLabel }}
              </h3>
              <Button
                v-if="isEditable"
                size="sm"
                class="h-8 gap-1.5 cursor-pointer text-xs"
                @click="handleActionClick(activeTab)"
              >
                <component
                  :is="actionConfig.icon"
                  class="size-3.5"
                />
                {{ actionConfig.text }}
              </Button>
            </div>

            <div class="p-6 lg:p-6 lg:pt-1">
              <TabsContent
                value="personal"
                class="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in-50 duration-200"
              >
                <PersonalInfoTab
                  :data="profileData"
                  :raw-profile="rawProfile"
                  :is-editable="false"
                  :is-saving="false"
                />

                <SchoolIdentityCard
                  v-if="profileData.schoolIdentity"
                  :data="profileData.schoolIdentity"
                  class="mt-6"
                />
              </TabsContent>

              <template
                v-for="tab in profileConfig.extraTabs"
                :key="tab.value"
              >
                <TabsContent
                  v-if="!tab.show || tab.show(profileData.roles ?? [])"
                  :value="tab.value"
                  class="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in-50 duration-200"
                >
                  <component
                    :is="tab.component"
                    v-bind="
                      tab.props
                        ? tab.props({
                            profileData: unref(profileData),
                            rawProfile: unref(rawProfile),
                            isAdmin: unref(isAdmin),
                            reloadProfile,
                          })
                        : { data: profileData }
                    "
                    :is-editable="isEditable"
                    @reload="reloadProfile"
                  />
                </TabsContent>
              </template>

              <TabsContent
                value="address"
                class="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in-50 duration-200"
              >
                <AddressInfoTab
                  :data="profileData"
                  :raw-address="rawProfile?.address"
                  :is-editable="false"
                />
              </TabsContent>

              <TabsContent
                value="security"
                class="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in-50 duration-200"
              >
                <ChangePasswordSection />
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </Card>
  </div>

  <EditAddressDialog
    v-model:open="showEditAddress"
    :profile-data="rawProfile"
    @reload="reloadProfile"
  />

  <component
    :is="sheet.component"
    v-for="(sheet, i) in profileConfig.extraSheets"
    :key="i"
    v-bind="
      sheet.props({
        userId: unref(getUserId),
        rawProfile: unref(rawProfile),
        profileData: unref(profileData),
        reloadProfile,
        isAdmin: unref(isAdmin),
      })
    "
  />
</template>
