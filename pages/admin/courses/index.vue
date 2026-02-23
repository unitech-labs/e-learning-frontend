<script setup lang="ts">
import { useCourseApi } from '@/composables/api/useCourseApi'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { t } = useI18n()

useHead({
  title: t('admin.courses.title'),
})

const router = useRouter()
const { getMyCourses } = useCourseApi()

const { data: allData, pending: isFetching } = useLazyAsyncData(
  'admin-courses',
  () => getMyCourses().then(r => r?.results ?? []),
  { default: () => [] },
)

const coursesData = computed(() => allData.value.filter((c: any) => c.course_type === 'course'))

const LEVEL_COLORS: Record<string, string> = {
  basic: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  driving_theory: 'bg-orange-100 text-orange-700',
}
const SUB_LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-teal-100 text-teal-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-sky-100 text-sky-700',
  B2: 'bg-sky-100 text-sky-700',
  C1: 'bg-violet-100 text-violet-700',
  C2: 'bg-violet-100 text-violet-700',
}
function levelClass(level: string) {
  return LEVEL_COLORS[level] ?? 'bg-gray-100 text-gray-600'
}
function subLevelClass(sub: string) {
  return SUB_LEVEL_COLORS[sub] ?? 'bg-gray-100 text-gray-600'
}
const resourcesData = computed(() => allData.value.filter((c: any) => c.course_type === 'resource'))
const isFetchingCourses = isFetching
const isFetchingResources = isFetching
</script>

<template>
  <div class="admin-courses px-4 flex flex-col gap-8">
    <!-- Page Header -->
    <div class="flex justify-between items-center gap-4">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('admin.courses.title') }}
      </h1>
      <a-button
        type="primary"
        class="!h-10 rounded-lg text-sm !font-semibold !flex !items-center justify-center bg-green-700 border-green-700 text-white hover:bg-green-800 hover:border-green-800"
        @click="router.push('/admin/courses/create')"
      >
        <Icon name="i-material-symbols-add-2-rounded" class="text-xl text-white mr-1" />
        {{ t('admin.courses.createCourse') }}
      </a-button>
    </div>

    <!-- Khoá học Section -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <Icon name="solar:book-bold-duotone" size="22" class="text-green-600" />
        <h2 class="text-xl font-bold text-gray-800">
          {{ t('admin.courses.coursesSection') }}
        </h2>
        <span v-if="!isFetchingCourses" class="ml-1 text-sm text-gray-400 font-normal">({{ coursesData.length }})</span>
      </div>

      <!-- Skeleton -->
      <div v-if="isFetchingCourses" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="p-3 border rounded-xl bg-white">
          <a-skeleton active :paragraph="{ rows: 2 }" />
        </div>
      </div>

      <!-- Grid -->
      <div v-else-if="coursesData.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RouterLink
          v-for="course in coursesData"
          :key="course.id"
          :to="`/admin/courses/${course.id}/course-detail`"
          class="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-green-300 transition-all duration-200"
        >
          <img
            :src="course.thumbnail || '/images/course-thumbnail-default.webp'"
            :alt="course.title"
            class="w-full h-28 object-cover"
          >
          <div class="p-3 space-y-1">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700 leading-snug">
              {{ course.title }}
            </h3>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span v-if="course.level" class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" :class="levelClass(course.level)">
                {{ course.level }}
              </span>
              <span v-if="course.course_sub_level" class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" :class="subLevelClass(course.course_sub_level)">
                {{ course.course_sub_level }}
              </span>
            </div>
            <div class="flex justify-end pt-1">
              <Icon name="solar:arrow-right-bold" size="14" class="text-gray-300 group-hover:text-green-500 transition-colors" />
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Icon name="solar:book-bold-duotone" size="40" class="text-gray-300 mb-3" />
        <p class="text-sm text-gray-500 mb-3">
          {{ t('admin.courses.noCourses') }}
        </p>
        <a-button size="small" type="primary" class="bg-green-700 border-green-700" @click="router.push('/admin/courses/create')">
          {{ t('admin.courses.createCourse') }}
        </a-button>
      </div>
    </section>

    <!-- Tài nguyên Section -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <Icon name="solar:folder-with-files-bold-duotone" size="22" class="text-blue-600" />
        <h2 class="text-xl font-bold text-gray-800">
          {{ t('admin.courses.resourcesSection') }}
        </h2>
        <span v-if="!isFetchingResources" class="ml-1 text-sm text-gray-400 font-normal">({{ resourcesData.length }})</span>
      </div>

      <!-- Skeleton -->
      <div v-if="isFetchingResources" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="n in 4" :key="n" class="p-3 border rounded-xl bg-white">
          <a-skeleton active :paragraph="{ rows: 2 }" />
        </div>
      </div>

      <!-- Grid -->
      <div v-else-if="resourcesData.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <RouterLink
          v-for="resource in resourcesData"
          :key="resource.id"
          :to="`/admin/courses/${resource.id}/course-detail`"
          class="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-300 transition-all duration-200"
        >
          <img
            :src="resource.thumbnail || '/images/course-thumbnail-default.webp'"
            :alt="resource.title"
            class="w-full h-28 object-cover"
          >
          <div class="p-3 space-y-1">
            <h3 class="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 leading-snug">
              {{ resource.title }}
            </h3>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span v-if="resource.level" class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" :class="levelClass(resource.level)">
                {{ resource.level }}
              </span>
              <span v-if="resource.course_sub_level" class="inline-block px-2 py-0.5 rounded-full text-xs font-medium" :class="subLevelClass(resource.course_sub_level)">
                {{ resource.course_sub_level }}
              </span>
            </div>
            <div class="flex justify-end pt-1">
              <Icon name="solar:arrow-right-bold" size="14" class="text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- Empty -->
      <div v-else class="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <Icon name="solar:folder-with-files-bold-duotone" size="40" class="text-gray-300 mb-3" />
        <p class="text-sm text-gray-500 mb-3">
          {{ t('admin.courses.noResources') }}
        </p>
        <a-button size="small" type="primary" @click="router.push('/admin/courses/create')">
          {{ t('admin.courses.createResource') }}
        </a-button>
      </div>
    </section>
  </div>
</template>
