<script setup lang="ts">
import type { CourseAsset } from '~/composables/api/useAssetApi'

const props = defineProps<{
  open: boolean
  resource: CourseAsset | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
})

const previewType = computed(() => {
  if (!props.resource) return 'unsupported'
  const type = props.resource.asset_type
  if (type === 'pdf') return 'pdf'
  if (type === 'image') return 'image'
  if (type === 'audio') return 'audio'
  if (type === 'video') return 'video'
  if (type === 'ppt') return 'office'
  if (type === 'doc') return 'office'
  return 'unsupported'
})

const officeViewerUrl = computed(() => {
  if (!props.resource?.file_url) return ''
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.resource.file_url)}`
})

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="resource?.title || t('admin.resources.preview.title')"
    :footer="null"
    :width="previewType === 'audio' ? 600 : 1200"
    :body-style="{ padding: 0 }"
    :destroy-on-close="true"
    centered
  >
    <div v-if="resource" class="preview-body">
      <!-- PDF Preview -->
      <div v-if="previewType === 'pdf'" class="preview-pdf">
        <ClientOnly>
          <LearningPdfViewer
            :url="resource.file_url"
            :scale="1.2"
          />
        </ClientOnly>
      </div>

      <!-- Image Preview -->
      <div v-else-if="previewType === 'image'" class="preview-image">
        <img
          :src="resource.file_url"
          :alt="resource.title"
          class="max-w-full max-h-full object-contain"
        >
      </div>

      <!-- Audio Preview -->
      <div v-else-if="previewType === 'audio'" class="preview-audio">
        <div class="flex flex-col items-center gap-6 py-8">
          <Icon name="solar:music-note-bold" size="64" class="text-pink-400" />
          <h3 class="text-lg font-medium text-gray-800">
            {{ resource.title }}
          </h3>
          <audio controls class="w-full max-w-md">
            <source :src="resource.file_url">
          </audio>
          <p class="text-sm text-gray-400">
            {{ formatFileSize(resource.file_size) }}
          </p>
        </div>
      </div>

      <!-- Video Preview -->
      <div v-else-if="previewType === 'video'" class="preview-video">
        <video controls class="w-full h-full">
          <source :src="resource.file_url">
        </video>
      </div>

      <!-- Office (PPTX/DOC) Preview via Microsoft Online -->
      <div v-else-if="previewType === 'office'" class="preview-office">
        <iframe
          :src="officeViewerUrl"
          frameborder="0"
          class="w-full h-full"
          allowfullscreen
        />
      </div>

      <!-- Unsupported type -->
      <div v-else class="preview-unsupported">
        <div class="flex flex-col items-center gap-4 py-12">
          <Icon name="solar:file-bold" size="64" class="text-gray-300" />
          <p class="text-gray-500">
            {{ t('admin.resources.preview.unsupported') }}
          </p>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.preview-body {
  background: #f5f5f5;
  min-height: 200px;
}

.preview-pdf {
  height: 75vh;
  overflow-y: auto;
}

.preview-image {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 75vh;
  padding: 16px;
  overflow: auto;
}

.preview-audio {
  padding: 16px;
  background: #fff;
}

.preview-video {
  height: 75vh;
  background: #000;
}

.preview-office {
  height: 75vh;
}

.preview-unsupported {
  background: #fff;
}
</style>
