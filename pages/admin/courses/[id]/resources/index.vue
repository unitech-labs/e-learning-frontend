<script setup lang="ts">
import type { AssetFolder, CourseAsset } from '~/composables/api/useAssetApi'
import { message, Modal } from 'ant-design-vue'
import ResourceEditModal from '~/components/admin/course/resource/ResourceEditModal.vue'
import ResourceFormModal from '~/components/admin/course/resource/ResourceFormModal.vue'
import ResourcePreviewModal from '~/components/admin/course/resource/ResourcePreviewModal.vue'
import { useAssetApi } from '~/composables/api/useAssetApi'
import { useCourse } from '~/composables/useCourse'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const { t } = useI18n()
const courseId = computed(() => route.params.id as string)
const { deleteAsset, browseFolder, createFolder, updateFolder, deleteFolder } = useAssetApi()
const { currentCourse, fetchCourseDetail } = useCourse()

// Check if course type is 'course'
const isCourseType = computed(() => currentCourse.value?.course_type === 'course')

// View mode: 'grid' or 'list'
const viewMode = ref<'grid' | 'list'>('grid')

function handleViewModeChange(mode: 'grid' | 'list') {
  viewMode.value = mode
  if (process.client) {
    localStorage.setItem('resources-view-mode', mode)
  }
}

onMounted(() => {
  if (process.client) {
    const savedViewMode = localStorage.getItem('resources-view-mode')
    if (savedViewMode === 'grid' || savedViewMode === 'list') {
      viewMode.value = savedViewMode
    }
  }
})

// State
const resources = ref<CourseAsset[]>([])
const subfolders = ref<AssetFolder[]>([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isPreviewOpen = ref(false)
const previewResource = ref<CourseAsset | null>(null)
const editingResource = ref<CourseAsset | null>(null)

// Folder browsing state
const breadcrumbs = ref<{ id: string | null, name: string }[]>([
  { id: null, name: t('admin.resources.root') },
])
const currentFolderId = computed(() => breadcrumbs.value[breadcrumbs.value.length - 1].id)

// Folder create/rename dialog state
const showFolderDialog = ref(false)
const folderDialogMode = ref<'create' | 'rename'>('create')
const folderDialogName = ref('')
const renamingFolderId = ref<string | null>(null)
const isFolderSaving = ref(false)

async function loadFolderContents() {
  try {
    isLoading.value = true
    const response = await browseFolder(courseId.value, currentFolderId.value)
    subfolders.value = response.subfolders || []
    resources.value = response.assets || []
  }
  catch (error: any) {
    console.error('Error loading folder contents:', error)
    message.error(error?.data?.message || t('admin.resources.folder.loadFailed'))
  }
  finally {
    isLoading.value = false
  }
}

function navigateIntoFolder(folder: AssetFolder) {
  breadcrumbs.value.push({ id: folder.id, name: folder.name })
  loadFolderContents()
}

function navigateToBreadcrumb(index: number) {
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  loadFolderContents()
}

function handleAddResource() {
  editingResource.value = null
  isModalOpen.value = true
}

function handlePreviewResource(resource: CourseAsset) {
  previewResource.value = resource
  isPreviewOpen.value = true
}

function handleEditResource(resource: CourseAsset) {
  editingResource.value = resource
  isEditModalOpen.value = true
}

async function handleDeleteResource(resourceId: string) {
  const resource = resources.value.find(r => r.id === resourceId)
  if (!resource)
    return

  Modal.confirm({
    title: t('admin.resources.deleteConfirm.title'),
    content: t('admin.resources.deleteConfirm.content', { title: resource.title }),
    okText: t('admin.resources.deleteConfirm.okText'),
    cancelText: t('admin.resources.deleteConfirm.cancelText'),
    okType: 'danger',
    async onOk() {
      try {
        await deleteAsset(courseId.value, resourceId)
        message.success(t('admin.resources.notifications.deleteSuccess'))
        await loadFolderContents()
      }
      catch (error: any) {
        console.error('Error deleting resource:', error)
        message.error(error?.data?.message || t('admin.resources.notifications.deleteFailed'))
      }
    },
  })
}

// Folder CRUD
function openCreateFolderDialog() {
  folderDialogMode.value = 'create'
  folderDialogName.value = ''
  renamingFolderId.value = null
  showFolderDialog.value = true
}

function openRenameFolderDialog(folder: AssetFolder) {
  folderDialogMode.value = 'rename'
  folderDialogName.value = folder.name
  renamingFolderId.value = folder.id
  showFolderDialog.value = true
}

async function handleFolderDialogSave() {
  const name = folderDialogName.value.trim()
  if (!name)
    return

  try {
    isFolderSaving.value = true

    if (folderDialogMode.value === 'create') {
      await createFolder(courseId.value, {
        name,
        parent: currentFolderId.value,
      })
      message.success(t('admin.resources.folder.createSuccess'))
    }
    else if (renamingFolderId.value) {
      await updateFolder(courseId.value, renamingFolderId.value, { name })
      message.success(t('admin.resources.folder.renameSuccess'))
    }

    showFolderDialog.value = false
    await loadFolderContents()
  }
  catch (error: any) {
    console.error('Error saving folder:', error)
    const key = folderDialogMode.value === 'create' ? 'createFailed' : 'renameFailed'
    message.error(error?.data?.message || error?.data?.non_field_errors?.[0] || t(`admin.resources.folder.${key}`))
  }
  finally {
    isFolderSaving.value = false
  }
}

function handleDeleteFolder(folder: AssetFolder) {
  Modal.confirm({
    title: t('admin.resources.folder.deleteTitle'),
    content: t('admin.resources.folder.deleteContent', { name: folder.name }),
    okText: t('admin.resources.folder.deleteOk'),
    cancelText: t('admin.resources.folder.deleteCancel'),
    okType: 'danger',
    async onOk() {
      try {
        await deleteFolder(courseId.value, folder.id)
        message.success(t('admin.resources.folder.deleteSuccess'))
        await loadFolderContents()
      }
      catch (error: any) {
        console.error('Error deleting folder:', error)
        message.error(error?.data?.message || t('admin.resources.folder.deleteFailed'))
      }
    },
  })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getAssetTypeInfo(type: string) {
  const typeMap: Record<string, { icon: string, color: string, bgColor: string }> = {
    video: { icon: 'solar:videocamera-record-bold', color: 'text-red-500', bgColor: 'bg-red-50' },
    pdf: { icon: 'solar:document-text-bold', color: 'text-red-500', bgColor: 'bg-red-50' },
    doc: { icon: 'solar:document-bold', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    ppt: { icon: 'solar:presentation-graph-bold', color: 'text-orange-500', bgColor: 'bg-orange-50' },
    zip: { icon: 'solar:archive-bold', color: 'text-purple-500', bgColor: 'bg-purple-50' },
    image: { icon: 'solar:gallery-bold', color: 'text-green-500', bgColor: 'bg-green-50' },
    audio: { icon: 'solar:music-note-bold', color: 'text-pink-500', bgColor: 'bg-pink-50' },
    other: { icon: 'solar:file-bold', color: 'text-gray-500', bgColor: 'bg-gray-50' },
  }
  return typeMap[type] || typeMap.other
}

const hasContent = computed(() => subfolders.value.length > 0 || resources.value.length > 0)

async function handleSaveResource() {
  await loadFolderContents()
  isModalOpen.value = false
  isEditModalOpen.value = false
  editingResource.value = null
}

onMounted(async () => {
  await fetchCourseDetail(courseId.value)
  await loadFolderContents()
})
</script>

<template>
  <div class="drive-container min-h-screen p-5 py-2">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-1 px-2 py-3">
      <!-- Breadcrumbs -->
      <div class="flex items-center gap-1 text-sm min-w-0">
        <template v-for="(crumb, index) in breadcrumbs" :key="index">
          <Icon v-if="index > 0" name="i-heroicons-chevron-right" size="14" class="text-gray-400 flex-shrink-0" />
          <button
            v-if="index < breadcrumbs.length - 1"
            class="text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer rounded-md px-2 py-1 transition-colors truncate"
            @click="navigateToBreadcrumb(index)"
          >
            {{ crumb.name }}
          </button>
          <span v-else class="text-gray-900 font-semibold px-2 py-1 truncate">{{ crumb.name }}</span>
        </template>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <a-button-group size="small">
          <a-button
            class="!flex !justify-center items-center"
            :type="viewMode === 'list' ? 'primary' : 'default'"
            @click="handleViewModeChange('list')"
          >
            <Icon name="solar:list-bold" size="16" />
          </a-button>
          <a-button
            class="!flex !justify-center items-center"
            :type="viewMode === 'grid' ? 'primary' : 'default'"
            @click="handleViewModeChange('grid')"
          >
            <Icon name="solar:widget-4-bold" size="16" />
          </a-button>
        </a-button-group>

        <a-button size="small" class="!flex !justify-center items-center" @click="openCreateFolderDialog">
          <Icon name="solar:folder-with-files-bold" size="16" class="mr-1" />
          {{ t('admin.resources.addFolder') }}
        </a-button>

        <a-button
          type="primary"
          size="small"
          class="!bg-green-700 !border-green-700 !flex !justify-center items-center"
          @click="handleAddResource"
        >
          <Icon name="solar:upload-bold" size="16" class="mr-1" />
          {{ t('admin.resources.addResource') }}
        </a-button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="px-2">
      <div v-for="n in 5" :key="n" class="py-3 border-b border-gray-100">
        <a-skeleton active :paragraph="{ rows: 0 }" />
      </div>
    </div>

    <template v-else>
      <!-- ===== GRID VIEW ===== -->
      <template v-if="viewMode === 'grid'">
        <!-- Folders section -->
        <div v-if="subfolders.length > 0" class="mb-6">
          <div class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            {{ t('admin.resources.addFolder').replace(/^.*$/, 'Folders') }}
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2">
            <div
              v-for="folder in subfolders"
              :key="folder.id"
              class="drive-folder-card group"
              @click="navigateIntoFolder(folder)"
            >
              <div class="flex items-center gap-3 px-3 py-2.5">
                <Icon name="solar:folder-bold" size="20" class="text-gray-500 flex-shrink-0" />
                <span class="text-sm font-medium text-gray-800 truncate flex-1">{{ folder.name }}</span>
                <a-dropdown :trigger="['click']" @click.stop>
                  <button class="drive-item-menu" @click.stop>
                    <Icon name="solar:menu-dots-bold" size="16" />
                  </button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="rename" @click.stop="openRenameFolderDialog(folder)">
                        <div class="flex items-center gap-2 text-sm">
                          <Icon name="solar:pen-bold" size="14" />
                          {{ t('admin.resources.folder.rename') }}
                        </div>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="delete" danger @click.stop="handleDeleteFolder(folder)">
                        <div class="flex items-center gap-2 text-sm">
                          <Icon name="solar:trash-bin-trash-bold" size="14" />
                          {{ t('admin.resources.delete') }}
                        </div>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </div>
        </div>

        <!-- Files section -->
        <div v-if="resources.length > 0">
          <div class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            Files
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-2">
            <div
              v-for="resource in resources"
              :key="resource.id"
              class="drive-file-card group cursor-pointer"
              @click="handlePreviewResource(resource)"
            >
              <!-- Thumbnail area -->
              <div :class="`drive-file-thumb ${getAssetTypeInfo(resource.asset_type).bgColor}`">
                <Icon :name="getAssetTypeInfo(resource.asset_type).icon" size="40" :class="getAssetTypeInfo(resource.asset_type).color" />
              </div>
              <!-- File info -->
              <div class="flex items-center gap-2 px-3 py-2.5">
                <Icon :name="getAssetTypeInfo(resource.asset_type).icon" size="16" :class="getAssetTypeInfo(resource.asset_type).color" class="flex-shrink-0" />
                <span class="text-sm font-medium text-gray-800 truncate flex-1">{{ resource.title }}</span>
                <a-dropdown :trigger="['click']">
                  <button class="drive-item-menu" @click.stop>
                    <Icon name="solar:menu-dots-bold" size="16" />
                  </button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="edit" @click="handleEditResource(resource)">
                        <div class="flex items-center gap-2 text-sm">
                          <Icon name="solar:pen-bold" size="14" />
                          {{ t('admin.resources.edit') }}
                        </div>
                      </a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="delete" danger @click="handleDeleteResource(resource.id)">
                        <div class="flex items-center gap-2 text-sm">
                          <Icon name="solar:trash-bin-trash-bold" size="14" />
                          {{ t('admin.resources.delete') }}
                        </div>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ===== LIST VIEW ===== -->
      <template v-else>
        <!-- List header -->
        <div class="drive-list-header">
          <div class="flex-1 min-w-0">{{ t('admin.resources.table.columns.title') }}</div>
          <div v-if="isCourseType" class="w-24 hidden lg:block">{{ t('admin.resources.table.columns.classrooms') }}</div>
          <div class="w-24 hidden sm:block text-right">{{ t('admin.resources.table.columns.size') }}</div>
          <div class="w-28 hidden md:block text-right">{{ t('admin.resources.table.columns.uploadedAt') }}</div>
          <div class="w-10" />
        </div>

        <!-- Folder rows -->
        <div
          v-for="folder in subfolders"
          :key="folder.id"
          class="drive-list-row group cursor-pointer"
          @click="navigateIntoFolder(folder)"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <Icon name="solar:folder-bold" size="20" class="text-gray-500 flex-shrink-0" />
            <span class="text-sm text-gray-800 truncate">{{ folder.name }}</span>
          </div>
          <div v-if="isCourseType" class="w-24 hidden lg:block text-xs text-gray-400">
            —
          </div>
          <div class="w-24 hidden sm:block text-right text-xs text-gray-400">
            —
          </div>
          <div class="w-28 hidden md:block text-right text-xs text-gray-400">
            {{ formatDate(folder.created_at) }}
          </div>
          <div class="w-10 flex justify-end">
            <a-dropdown :trigger="['click']" @click.stop>
              <button class="drive-item-menu" @click.stop>
                <Icon name="solar:menu-dots-bold" size="16" />
              </button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="rename" @click.stop="openRenameFolderDialog(folder)">
                    <div class="flex items-center gap-2 text-sm">
                      <Icon name="solar:pen-bold" size="14" />
                      {{ t('admin.resources.folder.rename') }}
                    </div>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click.stop="handleDeleteFolder(folder)">
                    <div class="flex items-center gap-2 text-sm">
                      <Icon name="solar:trash-bin-trash-bold" size="14" />
                      {{ t('admin.resources.delete') }}
                    </div>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>

        <!-- File rows -->
        <div
          v-for="resource in resources"
          :key="resource.id"
          class="drive-list-row group cursor-pointer"
          @click="handlePreviewResource(resource)"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <Icon :name="getAssetTypeInfo(resource.asset_type).icon" size="20" :class="getAssetTypeInfo(resource.asset_type).color" class="flex-shrink-0" />
            <span class="text-sm text-gray-800 truncate">{{ resource.title }}</span>
          </div>
          <div v-if="isCourseType" class="w-24 hidden lg:block">
            <span v-if="resource.visible_classrooms && resource.visible_classrooms.length > 0" class="text-xs text-gray-500">
              {{ resource.visible_classrooms.length }} {{ t('admin.resources.classrooms') }}
            </span>
            <span v-else class="text-xs text-gray-400">{{ t('admin.resources.allClassrooms') }}</span>
          </div>
          <div class="w-24 hidden sm:block text-right text-xs text-gray-500">
            {{ formatFileSize(resource.file_size) }}
          </div>
          <div class="w-28 hidden md:block text-right text-xs text-gray-500">
            {{ formatDate(resource.uploaded_at) }}
          </div>
          <div class="w-10 flex justify-end">
            <a-dropdown :trigger="['click']">
              <button class="drive-item-menu" @click.stop>
                <Icon name="solar:menu-dots-bold" size="16" />
              </button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="edit" @click="handleEditResource(resource)">
                    <div class="flex items-center gap-2 text-sm">
                      <Icon name="solar:pen-bold" size="14" />
                      {{ t('admin.resources.edit') }}
                    </div>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" danger @click="handleDeleteResource(resource.id)">
                    <div class="flex items-center gap-2 text-sm">
                      <Icon name="solar:trash-bin-trash-bold" size="14" />
                      {{ t('admin.resources.delete') }}
                    </div>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="!hasContent" class="flex flex-col items-center justify-center py-20">
        <Icon name="solar:folder-open-bold-duotone" size="80" class="text-gray-200 mb-4" />
        <h3 class="text-base font-medium text-gray-600 mb-1">
          {{ t('admin.resources.empty.title') }}
        </h3>
        <p class="text-sm text-gray-400 mb-5">
          {{ t('admin.resources.empty.subtitle') }}
        </p>
        <div class="flex gap-2">
          <a-button class="!flex !justify-center items-center" @click="openCreateFolderDialog">
            <Icon name="solar:folder-with-files-bold" size="16" class="mr-1" />
            {{ t('admin.resources.addFolder') }}
          </a-button>
          <a-button type="primary" class="!bg-green-700 !border-green-700 !flex !justify-center items-center" @click="handleAddResource">
            <Icon name="solar:upload-bold" size="16" class="mr-1" />
            {{ t('admin.resources.addResource') }}
          </a-button>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <ResourceFormModal
      v-model:open="isModalOpen"
      :course-id="courseId"
      :folder-id="currentFolderId"
      @save="handleSaveResource"
    />

    <ResourceEditModal
      v-model:open="isEditModalOpen"
      :resource="editingResource"
      :course-id="courseId"
      @save="handleSaveResource"
    />

    <ResourcePreviewModal
      v-model:open="isPreviewOpen"
      :resource="previewResource"
    />

    <a-modal
      v-model:open="showFolderDialog"
      :title="folderDialogMode === 'create' ? t('admin.resources.folder.createTitle') : t('admin.resources.folder.renameTitle')"
      :ok-text="t('admin.resources.folder.save')"
      :cancel-text="t('admin.resources.folder.cancel')"
      :confirm-loading="isFolderSaving"
      @ok="handleFolderDialogSave"
    >
      <div class="py-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('admin.resources.folder.nameLabel') }}</label>
        <a-input
          v-model:value="folderDialogName"
          :placeholder="t('admin.resources.folder.namePlaceholder')"
          size="large"
          @press-enter="handleFolderDialogSave"
        />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.drive-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

/* ── Folder card (grid) ── */
.drive-folder-card {
  background: #f3f4f6;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}
.drive-folder-card:hover {
  background: #e8eaed;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ── File card (grid) ── */
.drive-file-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  cursor: default;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.drive-file-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.drive-file-thumb {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f3f4f6;
}

/* ── List view ── */
.drive-list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
  user-select: none;
}

.drive-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #f9fafb;
  transition: background 0.1s;
}
.drive-list-row:hover {
  background: #f3f4f6;
}
.drive-list-row:last-child {
  border-bottom: none;
}

/* ── Three-dot menu button ── */
.drive-item-menu {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}
.group:hover .drive-item-menu {
  opacity: 1;
}
.drive-item-menu:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #374151;
}
</style>
