export default defineNuxtRouteMiddleware(() => {
  const { isLoggedIn, isInitializing, user } = useAuth()

  if (isInitializing.value) {
    return
  }

  if (!isLoggedIn.value) {
    return navigateTo('/auth/login', { external: true })
  }

  // Khu quản trị mở cho giáo viên VÀ tài khoản admin (is_admin từ /auth/me).
  if (!user.value || !(user.value.is_teacher || user.value.is_admin)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied: Admin privileges required',
    })
  }
})
