<script setup lang="ts">
import type { AdminDevice } from '~/composables/api/useDeviceApi'
import { message, Modal } from 'ant-design-vue'

import { useDeviceApi } from '~/composables/api/useDeviceApi'
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

useHead({
  title: 'Device Management',
})

const { t } = useI18n()
const deviceApi = useDeviceApi()

// State
const devices = ref<AdminDevice[]>([])
const loading = ref(false)
const searchQuery = ref('')
const deviceTypeFilter = ref('')
const isActiveFilter = ref('')

// Load devices from API
async function loadDevices() {
  try {
    loading.value = true
    const params: Record<string, string> = {}
    if (searchQuery.value)
      params.search = searchQuery.value
    if (deviceTypeFilter.value)
      params.device_type = deviceTypeFilter.value
    if (isActiveFilter.value)
      params.is_active = isActiveFilter.value

    devices.value = await deviceApi.getAdminDevices(params)
  }
  catch (err: any) {
    console.error('Error loading devices:', err)
    message.error(t('admin.devices.messages.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

// Stats
const totalDevices = computed(() => devices.value.length)
const activeDevices = computed(() => devices.value.filter(d => d.is_active).length)
const laptopCount = computed(() => devices.value.filter(d => d.device_type === 'laptop').length)
const tabletCount = computed(() => devices.value.filter(d => d.device_type === 'tablet').length)
const phoneCount = computed(() => devices.value.filter(d => d.device_type === 'phone').length)

// Delete device
function confirmDelete(device: AdminDevice) {
  Modal.confirm({
    title: t('admin.devices.messages.deleteConfirm', {
      deviceName: device.device_name,
      userEmail: device.user_email,
    }),
    okText: t('admin.devices.table.actions'),
    okType: 'danger',
    async onOk() {
      try {
        await deviceApi.deleteAdminDevice(device.id)
        message.success(t('admin.devices.messages.deleteSuccess'))
        await loadDevices()
      }
      catch {
        message.error(t('admin.devices.messages.deleteFailed'))
      }
    },
  })
}

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
function onSearchChange() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadDevices()
  }, 400)
}

// Watch filters
watch([deviceTypeFilter, isActiveFilter], () => {
  loadDevices()
})

// Device type config
const deviceTypeConfig: Record<string, { color: string, icon: string }> = {
  laptop: { color: 'blue', icon: 'solar:laptop-bold' },
  tablet: { color: 'orange', icon: 'solar:tablet-bold' },
  phone: { color: 'green', icon: 'solar:smartphone-bold' },
}

// Format date
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

// Table columns
const columns = computed(() => [
  { title: t('admin.devices.table.user'), key: 'user', width: 220 },
  { title: t('admin.devices.table.deviceName'), dataIndex: 'device_name', key: 'device_name', width: 180 },
  { title: t('admin.devices.table.deviceType'), dataIndex: 'device_type', key: 'device_type', width: 120 },
  { title: t('admin.devices.table.ipAddress'), dataIndex: 'ip_address', key: 'ip_address', width: 140 },
  { title: t('admin.devices.table.lastLogin'), dataIndex: 'last_login_at', key: 'last_login_at', width: 180 },
  { title: t('admin.devices.table.status'), dataIndex: 'is_active', key: 'is_active', width: 120 },
  { title: t('admin.devices.table.actions'), key: 'actions', width: 100, fixed: 'right' as const },
])

onMounted(() => {
  loadDevices()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center gap-3">
      <div class="p-3 bg-blue-100 rounded-xl">
        <Icon name="solar:devices-bold" size="28" class="text-blue-600" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ t('admin.devices.title') }}
        </h1>
        <p class="text-sm text-gray-500">
          {{ t('admin.devices.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gray-100 rounded-lg">
            <Icon name="solar:devices-bold" size="20" class="text-gray-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">
              {{ totalDevices }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('admin.devices.stats.total') }}
            </p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg">
            <Icon name="solar:check-circle-bold" size="20" class="text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-green-600">
              {{ activeDevices }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('admin.devices.stats.active') }}
            </p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg">
            <Icon name="solar:laptop-bold" size="20" class="text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">
              {{ laptopCount }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('admin.devices.stats.laptop') }}
            </p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-orange-100 rounded-lg">
            <Icon name="solar:tablet-bold" size="20" class="text-orange-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-orange-600">
              {{ tabletCount }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('admin.devices.stats.tablet') }}
            </p>
          </div>
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg">
            <Icon name="solar:smartphone-bold" size="20" class="text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-green-600">
              {{ phoneCount }}
            </p>
            <p class="text-xs text-gray-500">
              {{ t('admin.devices.stats.phone') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <a-input
        v-model:value="searchQuery"
        :placeholder="t('admin.devices.search.placeholder')"
        size="large"
        allow-clear
        class="sm:max-w-sm"
        @input="onSearchChange"
      >
        <template #prefix>
          <Icon name="solar:magnifer-linear" size="18" class="text-gray-400" />
        </template>
      </a-input>

      <a-select
        v-model:value="deviceTypeFilter"
        size="large"
        class="sm:w-40"
      >
        <a-select-option value="">
          {{ t('admin.devices.filter.allTypes') }}
        </a-select-option>
        <a-select-option value="laptop">
          {{ t('admin.devices.filter.laptop') }}
        </a-select-option>
        <a-select-option value="tablet">
          {{ t('admin.devices.filter.tablet') }}
        </a-select-option>
        <a-select-option value="phone">
          {{ t('admin.devices.filter.phone') }}
        </a-select-option>
      </a-select>

      <a-select
        v-model:value="isActiveFilter"
        size="large"
        class="sm:w-48"
      >
        <a-select-option value="">
          {{ t('admin.devices.filter.allStatus') }}
        </a-select-option>
        <a-select-option value="true">
          {{ t('admin.devices.filter.active') }}
        </a-select-option>
        <a-select-option value="false">
          {{ t('admin.devices.filter.inactive') }}
        </a-select-option>
      </a-select>

      <a-button size="large" @click="loadDevices">
        <template #icon>
          <Icon name="solar:refresh-bold" size="18" />
        </template>
      </a-button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <a-table
        :columns="columns"
        :data-source="devices"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total: number) => `${total} devices` }"
        row-key="id"
        :scroll="{ x: 1100 }"
        size="middle"
      >
        <!-- User column -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div>
              <p class="font-medium text-gray-900 text-sm">
                {{ record.user_email }}
              </p>
              <p class="text-xs text-gray-500">
                {{ record.user_username }}
              </p>
            </div>
          </template>

          <!-- Device Type -->
          <template v-else-if="column.key === 'device_type'">
            <a-tag :color="deviceTypeConfig[record.device_type]?.color || 'default'">
              <div class="flex items-center gap-1">
                <Icon :name="deviceTypeConfig[record.device_type]?.icon || 'solar:devices-bold'" size="14" />
                {{ t(`admin.devices.filter.${record.device_type}`) }}
              </div>
            </a-tag>
          </template>

          <!-- Last Login -->
          <template v-else-if="column.key === 'last_login_at'">
            <span class="text-sm text-gray-600">{{ formatDate(record.last_login_at) }}</span>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'default'">
              {{ record.is_active ? t('admin.devices.filter.active') : t('admin.devices.filter.inactive') }}
            </a-tag>
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <a-button
              type="text"
              danger
              size="small"
              @click="confirmDelete(record)"
            >
              <template #icon>
                <Icon name="solar:trash-bin-trash-bold" size="16" />
              </template>
            </a-button>
          </template>
        </template>

        <!-- Empty state -->
        <template #emptyText>
          <div class="py-12 text-center">
            <Icon name="solar:devices-bold" size="48" class="text-gray-300 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-500">
              {{ t('admin.devices.empty.title') }}
            </h3>
            <p class="text-sm text-gray-400 mt-1">
              {{ t('admin.devices.empty.description') }}
            </p>
          </div>
        </template>
      </a-table>
    </div>
  </div>
</template>
