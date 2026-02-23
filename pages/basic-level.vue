<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()

const highlights = computed(() => t('levels.basic.highlights') as string[])

const statIcons = ['solar:users-group-rounded-bold', 'solar:star-bold', 'solar:videocamera-record-line-duotone', 'solar:checklist-minimalistic-bold']
const stats = computed(() => {
  const items = t('levels.basic.stats') as Array<{ label: string; value: string }>
  return items.map((s, i) => ({ ...s, icon: statIcons[i] }))
})

const beginnerCourses = computed(() => {
  const c = (key: string) => (path: string) => t(`levels.basic.courses.${key}.${path}`)
  return [
    {
      key: 'A1',
      level: 'A1',
      title: c('A1')('title'),
      description: c('A1')('description'),
      duration: c('A1')('duration'),
      outcomes: [c('A1')('outcome1'), c('A1')('outcome2'), c('A1')('outcome3')],
      classes: [
        { key: 'A1-1', label: c('A1')('class1'), href: '/courses?level=beginner&sublevel=A1&class=A1-1', type: c('A1')('type11') },
        { key: 'A1-3', label: c('A1')('class2'), href: '/courses?level=beginner&sublevel=A1&class=A1-3', type: c('A1')('typeMicro') },
      ],
    },
    {
      key: 'A2',
      level: 'A2',
      title: c('A2')('title'),
      description: c('A2')('description'),
      duration: c('A2')('duration'),
      outcomes: [c('A2')('outcome1'), c('A2')('outcome2'), c('A2')('outcome3')],
      classes: [
        { key: 'A2-1', label: c('A2')('class1'), href: '/courses?level=beginner&sublevel=A2&class=A2-1', type: c('A1')('type11') },
        { key: 'A2-3', label: c('A2')('class2'), href: '/courses?level=beginner&sublevel=A2&class=A2-3', type: c('A1')('typeMicro') },
      ],
    },
  ]
})

const learningJourney = computed(() => t('levels.basic.journey') as Array<{ title: string; description: string }>)

const benefitIcons = ['ph:chalkboard-teacher-duotone', 'ph:device-mobile-camera-duotone', 'solar:shield-check-bold', 'solar:chat-round-line-bold-duotone']
const benefits = computed(() => {
  return [1, 2, 3, 4].map((i, idx) => ({
    title: t(`levels.basic.benefits.item${i}Title`),
    description: t(`levels.basic.benefits.item${i}Desc`),
    icon: benefitIcons[idx],
  }))
})

const testimonials = computed(() => [
  {
    name: t('levels.basic.testimonials.name1'),
    quote: t('levels.basic.testimonials.quote1'),
    avatar: 'https://i.pravatar.cc/100?img=36',
  },
  {
    name: t('levels.basic.testimonials.name2'),
    quote: t('levels.basic.testimonials.quote2'),
    avatar: 'https://i.pravatar.cc/100?img=12',
  },
])

const faqItems = computed(() => [
  { question: t('levels.basic.faq.q1'), answer: t('levels.basic.faq.a1') },
  { question: t('levels.basic.faq.q2'), answer: t('levels.basic.faq.a2') },
  { question: t('levels.basic.faq.q3'), answer: t('levels.basic.faq.a3') },
  { question: t('levels.basic.faq.q4'), answer: t('levels.basic.faq.a4') },
])
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-gray-50 via-white to-white">
    <!-- Hero Section -->
    <section class="bg-gradient-to-b from-green-700 to-green-600 text-white pt-16 pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-green-200 mb-4">
            {{ t('levels.basic.hero.badge') }}
          </p>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
            {{ t('levels.basic.hero.title') }}
          </h1>
          <p class="text-lg sm:text-xl text-green-100 mb-8 leading-relaxed">
            {{ t('levels.basic.hero.description') }}
          </p>
          <div class="flex flex-wrap gap-3 mb-10">
            <span
              v-for="tag in highlights"
              :key="tag"
              class="px-4 py-2 rounded-full border border-white/30 text-sm text-green-50 bg-white/10 backdrop-blur"
            >
              {{ tag }}
            </span>
          </div>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <NuxtLink
              to="#courses"
              class="w-full sm:w-auto inline-flex justify-center px-8 py-4 bg-white text-green-700 font-semibold rounded-full hover:bg-green-50 transition-colors shadow-lg"
            >
              {{ t('levels.basic.hero.ctaCourse') }}
            </NuxtLink>
            <NuxtLink
              to="/contact"
              class="w-full sm:w-auto inline-flex justify-center px-8 py-4 border border-white/30 text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            >
              {{ t('levels.basic.hero.ctaConsult') }}
            </NuxtLink>
          </div>
        </div>
        <div class="relative">
          <div class="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl blur-2xl" />
          <div class="relative bg-white/10 border border-white/30 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
            <h3 class="text-2xl font-bold mb-6">
              {{ t('levels.basic.hero.youWillAchieve') }}
            </h3>
            <div class="space-y-4">
              <div v-for="(item, index) in learningJourney" :key="item.title" class="flex gap-4 items-start">
                <div class="flex flex-col items-center">
                  <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                    {{ index + 1 }}
                  </div>
                  <div v-if="index !== learningJourney.length - 1" class="w-px h-12 bg-white/30 mt-2" />
                </div>
                <div>
                  <p class="text-sm uppercase text-green-100 tracking-wide mb-1">
                    {{ item.title }}
                  </p>
                  <p class="text-sm text-green-50 leading-relaxed">
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="py-12 sm:py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3"
        >
          <div class="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
            <Icon :name="stat.icon" size="22" />
          </div>
          <p class="text-2xl font-bold text-gray-900">
            {{ stat.value }}
          </p>
          <p class="text-gray-500 text-sm">
            {{ stat.label }}
          </p>
        </div>
      </div>
    </section>

    <!-- Level Overview -->
    <section id="overview" class="py-12 sm:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 items-center">
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <p class="text-sm font-semibold text-green-600 uppercase tracking-widest mb-4">
            {{ t('levels.basic.overview.badge') }}
          </p>
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            {{ t('levels.basic.overview.title') }}
          </h2>
          <div class="space-y-4 text-gray-600 leading-relaxed">
            <p>{{ t('levels.basic.overview.intro') }}</p>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <Icon name="solar:check-circle-bold" class="text-green-600 mt-1" />
                <span>{{ t('levels.basic.overview.bullet1') }}</span>
              </li>
              <li class="flex items-start gap-3">
                <Icon name="solar:check-circle-bold" class="text-green-600 mt-1" />
                <span>{{ t('levels.basic.overview.bullet2') }}</span>
              </li>
              <li class="flex items-start gap-3">
                <Icon name="solar:check-circle-bold" class="text-green-600 mt-1" />
                <span>{{ t('levels.basic.overview.bullet3') }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="grid gap-6">
          <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl p-8 shadow-lg">
            <p class="text-sm uppercase tracking-[0.3em] text-white/70 mb-3">
              {{ t('levels.basic.overview.roadmapBadge') }}
            </p>
            <h3 class="text-2xl font-bold mb-4">
              {{ t('levels.basic.overview.roadmapTitle') }}
            </h3>
            <p class="text-white/90 leading-relaxed">
              {{ t('levels.basic.overview.roadmapDesc') }}
            </p>
          </div>
          <div class="bg-white rounded-2xl shadow-xl p-8">
            <h4 class="text-xl font-semibold text-gray-900 mb-4">
              {{ t('levels.basic.overview.scheduleTitle') }}
            </h4>
            <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div class="p-4 rounded-xl border border-gray-100">
                <p class="text-gray-400 mb-1">{{ t('levels.basic.overview.evening') }}</p>
                <p class="font-semibold text-gray-900">18h30 - 21h</p>
                <p>{{ t('levels.basic.overview.monWedFri') }}</p>
              </div>
              <div class="p-4 rounded-xl border border-gray-100">
                <p class="text-gray-400 mb-1">{{ t('levels.basic.overview.weekend') }}</p>
                <p class="font-semibold text-gray-900">9h - 11h30</p>
                <p>{{ t('levels.basic.overview.satSun') }}</p>
              </div>
              <div class="p-4 rounded-xl border border-gray-100">
                <p class="text-gray-400 mb-1">{{ t('levels.basic.overview.format') }}</p>
                <p class="font-semibold text-gray-900">{{ t('levels.basic.overview.onlineLive') }}</p>
                <p>{{ t('levels.basic.overview.viaZoom') }}</p>
              </div>
              <div class="p-4 rounded-xl border border-gray-100">
                <p class="text-gray-400 mb-1">{{ t('levels.basic.overview.homework') }}</p>
                <p class="font-semibold text-gray-900">{{ t('levels.basic.overview.homeworkDesc') }}</p>
                <p>{{ t('levels.basic.overview.appPractice') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Courses Section -->
    <section id="courses" class="py-12 sm:py-16 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-10">
          <p class="text-sm font-semibold text-green-600 uppercase tracking-widest">
            {{ t('levels.basic.courses.badge') }}
          </p>
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
            {{ t('levels.basic.courses.sectionTitle') }}
          </h2>
          <p class="text-gray-600 text-lg">
            {{ t('levels.basic.courses.sectionDesc') }}
          </p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div
            v-for="course in beginnerCourses"
            :key="course.key"
            class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col"
          >
            <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
              <p class="text-sm uppercase tracking-[0.3em] text-white/70 mb-2">
                Level {{ course.level }}
              </p>
              <h3 class="text-2xl font-bold mb-2">
                {{ course.title }}
              </h3>
              <p class="text-white/80">
                {{ course.description }}
              </p>
              <p class="mt-4 font-semibold text-white">
                ⏱ {{ course.duration }}
              </p>
            </div>
            <div class="p-6 sm:p-8 flex-1 flex flex-col gap-6">
              <div>
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {{ t('levels.basic.courses.youWillAchieve') }}
                </h4>
                <ul class="space-y-2 text-gray-600">
                  <li v-for="outcome in course.outcomes" :key="outcome" class="flex items-start gap-2">
                    <Icon name="solar:check-circle-bold" class="text-green-500 mt-1" />
                    <span>{{ outcome }}</span>
                  </li>
                </ul>
              </div>
              <div class="border-t border-dashed border-gray-200 pt-6">
                <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {{ t('levels.basic.courses.chooseFormat') }}
                </h4>
                <div class="space-y-3">
                  <NuxtLink
                    v-for="classItem in course.classes"
                    :key="classItem.key"
                    :to="classItem.href"
                    class="block p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold text-gray-900 group-hover:text-green-700">
                          {{ classItem.label }}
                        </p>
                        <p class="text-xs uppercase tracking-wide text-gray-500">
                          {{ classItem.type }}
                        </p>
                      </div>
                      <Icon
                        name="solar:alt-arrow-right-line-duotone"
                        size="18"
                        class="text-gray-300 group-hover:text-green-600 transition-colors"
                      />
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="py-12 sm:py-16 bg-gray-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <p class="text-sm font-semibold text-green-600 uppercase tracking-widest">
            {{ t('levels.basic.benefits.badge') }}
          </p>
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
            {{ t('levels.basic.benefits.title') }}
          </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="benefit in benefits"
            :key="benefit.title"
            class="bg-white rounded-2xl border border-gray-100 p-6 flex gap-4"
          >
            <div class="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center text-2xl">
              <Icon :name="benefit.icon" size="26" />
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                {{ benefit.title }}
              </h3>
              <p class="text-gray-600 leading-relaxed">
                {{ benefit.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-12 sm:py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p class="text-sm font-semibold text-green-600 uppercase tracking-widest">
              {{ t('levels.basic.testimonials.badge') }}
            </p>
            <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 mt-3 mb-4">
              {{ t('levels.basic.testimonials.title') }}
            </h2>
            <p class="text-gray-600 mb-6 leading-relaxed">
              {{ t('levels.basic.testimonials.desc') }}
            </p>
            <NuxtLink
              to="/testimonials"
              class="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-full text-gray-700 hover:border-green-400 hover:text-green-600 transition-colors"
            >
              {{ t('levels.basic.testimonials.viewMore') }}
              <Icon name="solar:arrow-right-up-linear" size="18" />
            </NuxtLink>
          </div>
          <div class="space-y-6">
            <div
              v-for="review in testimonials"
              :key="review.name"
              class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div class="flex items-center gap-4 mb-4">
                <img :src="review.avatar" alt="" class="w-12 h-12 rounded-full object-cover">
                <div>
                  <p class="font-semibold text-gray-900">
                    {{ review.name }}
                  </p>
                  <p class="text-sm text-gray-500">
                    ⭐️⭐️⭐️⭐️⭐️
                  </p>
                </div>
              </div>
              <p class="text-gray-600 leading-relaxed">
                "{{ review.quote }}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-12 sm:py-16 bg-gray-900 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-8">
          <div>
            <p class="text-sm font-semibold text-green-300 uppercase tracking-widest">
              {{ t('levels.basic.faq.badge') }}
            </p>
            <h2 class="text-3xl sm:text-4xl font-bold mt-3 mb-4 text-balance">
              {{ t('levels.basic.faq.title') }}
            </h2>
            <p class="text-white/70 leading-relaxed">
              {{ t('levels.basic.faq.subtitle') }}
            </p>
          </div>
          <div class="space-y-4">
            <details
              v-for="faq in faqItems"
              :key="faq.question"
              class="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <summary class="cursor-pointer text-lg font-semibold mb-2 text-white">
                {{ faq.question }}
              </summary>
              <p class="text-white/80 leading-relaxed">
                {{ faq.answer }}
              </p>
            </details>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-12 sm:py-16">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-3xl p-10 sm:p-14 text-white shadow-2xl relative overflow-hidden">
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <h2 class="text-3xl sm:text-4xl font-bold mb-4">
            {{ t('levels.basic.cta.title') }}
          </h2>
          <p class="text-green-100 mb-8 text-lg max-w-2xl mx-auto">
            {{ t('levels.basic.cta.desc') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <NuxtLink
              to="/contact"
              class="inline-flex items-center justify-center px-6 py-4 bg-white text-green-600 font-semibold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
            >
              {{ t('levels.basic.cta.consult') }}
            </NuxtLink>
            <NuxtLink
              to="#courses"
              class="inline-flex items-center justify-center px-6 py-4 border border-white/40 text-white font-semibold rounded-full hover:bg-white/10 transition-colors"
            >
              {{ t('levels.basic.cta.schedule') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Add any custom styles here */
</style>
