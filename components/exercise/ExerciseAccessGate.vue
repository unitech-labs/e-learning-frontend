<template>
  <section class="mx-auto max-w-xl">
    <div class="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div class="flex h-1.5 w-full" aria-hidden="true">
        <span class="flex-1 bg-[#1B8A3C]" />
        <span class="flex-1 bg-white" />
        <span class="flex-1 bg-[#CE2B37]" />
      </div>

      <div class="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F1F9F3]">
        <Icon name="tabler:lock" class="text-3xl text-[#1B8A3C]" />
      </div>

      <h1 class="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
        Bài tập AI dành cho học viên
      </h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-gray-600 sm:text-base">
        Tính năng này mở cho học viên đang có khoá học. Đăng ký một khoá học để AI soạn
        bài tập tiếng Ý theo đúng chủ đề và trình độ của bạn.
      </p>

      <NuxtLink
        to="/courses"
        class="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 text-sm font-medium !text-white shadow-sm hover:from-green-700 hover:to-green-800"
      >
        <Icon name="tabler:school" />
        Xem khoá học
      </NuxtLink>
    </div>
  </section>
</template>
