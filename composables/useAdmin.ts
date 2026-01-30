import type { UserRole } from '~/types/auth.type'
import { useApiClient } from '~/api/apiClient'
import { formatCurrency } from '~/utils/currency'

// Types for dashboard stats
export interface DashboardStats {
  total_students: {
    value: number
    growth: number
  }
  active_courses: {
    value: number
    growth: number
  }
  monthly_revenue: {
    value: number
    growth: number
  }
  total_revenue: {
    value: number
  }
  completion_rate: {
    value: number
    growth: number
  }
}

export interface StatsCard {
  title: string
  value: string
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: string
  gradient: string
  cardBg: string
  iconBg: string
  iconColor: string
  showChange?: boolean
}

export function useAdmin() {
  const { user, isLoggedIn } = useAuth()
  const apiClient = useApiClient()
  const { t } = useI18n()

  // Dashboard stats data
  const dashboardStats = ref<DashboardStats>({
    total_students: { value: 0, growth: 0 },
    active_courses: { value: 0, growth: 0 },
    monthly_revenue: { value: 0, growth: 0 },
    total_revenue: { value: 0 },
    completion_rate: { value: 0, growth: 0 },
  })

  const isLoadingStats = ref(false)
  const statsError = ref<string | null>(null)

  // Check if current user is admin
  const isAdmin = computed(() => {
    return isLoggedIn.value && user.value?.is_teacher
  })

  // Check if user has specific role
  const hasRole = (role: UserRole): boolean => {
    return isLoggedIn.value && user.value?.role === role
  }

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: UserRole[]): boolean => {
    return isLoggedIn.value && user.value?.role ? roles.includes(user.value.role) : false
  }

  // Check if user is teacher or admin
  const isTeacherOrAdmin = computed(() => {
    return hasAnyRole(['teacher', 'admin'])
  })

  // Check if user can manage courses (teacher or admin)
  const canManageCourses = computed(() => {
    return isTeacherOrAdmin.value
  })

  // Check if user can access admin panel
  const canAccessAdmin = computed(() => {
    return isAdmin.value
  })

  // Format growth percentage
  function formatGrowth(growth: number): string {
    // Convert decimal to percentage (e.g., 0.038 -> 3.8%)
    const percentage = growth * 100
    if (percentage === 0)
      return '0%'
    return percentage > 0 ? `+${percentage.toFixed(1)}%` : `${percentage.toFixed(1)}%`
  }

  // Format values based on type
  function formatValue(key: string, value: number): string {
    switch (key) {
      case 'total_students':
        return value.toLocaleString()
      case 'active_courses':
        return value.toLocaleString()
      case 'monthly_revenue':
        return `${formatCurrency(value)}`
      case 'total_revenue':
        return `${formatCurrency(value)}`
      case 'completion_rate':
        return `${(value * 100).toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  // Get change type based on growth
  function getChangeType(growth: number): 'increase' | 'decrease' | 'neutral' {
    if (growth > 0)
      return 'increase'
    if (growth < 0)
      return 'decrease'
    return 'neutral'
  }

  // Fetch dashboard stats from API
  async function fetchDashboardStats(): Promise<void> {
    try {
      isLoadingStats.value = true
      statsError.value = null
      const response = await apiClient.get('/system/dashboard/summary/')

      // Handle response - check if it's wrapped in 'data' property
      const data = (response as any)?.data || response

      // Ensure response structure matches DashboardStats
      if (data && typeof data === 'object') {
        dashboardStats.value = {
          total_students: data.total_students || { value: 0, growth: 0 },
          active_courses: data.active_courses || { value: 0, growth: 0 },
          monthly_revenue: data.monthly_revenue || { value: 0, growth: 0 },
          total_revenue: data.total_revenue || { value: 0 },
          completion_rate: data.completion_rate || { value: 0, growth: 0 },
        }
      }
      else {
        console.error('Invalid response structure:', response)
      }
    }
    catch (error: any) {
      console.error('Error fetching dashboard stats:', error)
      statsError.value = error.message || 'Failed to fetch dashboard statistics'
    }
    finally {
      isLoadingStats.value = false
    }
  }

  // Generate stats cards from dashboard data
  const statsCards = computed<StatsCard[]>(() => {
    return [
      {
        title: t('admin.dashboard.stats.totalUsers'),
        value: formatValue('total_students', dashboardStats.value.total_students.value),
        change: formatGrowth(dashboardStats.value.total_students.growth),
        changeType: getChangeType(dashboardStats.value.total_students.growth),
        icon: 'i-heroicons-users-solid',
        gradient: 'from-blue-500 to-cyan-500',
        cardBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        showChange: true,
      },
      {
        title: t('admin.dashboard.stats.activeCourses'),
        value: formatValue('active_courses', dashboardStats.value.active_courses.value),
        change: formatGrowth(dashboardStats.value.active_courses.growth),
        changeType: getChangeType(dashboardStats.value.active_courses.growth),
        icon: 'i-heroicons-academic-cap-solid',
        gradient: 'from-purple-500 to-pink-500',
        cardBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        showChange: true,
      },
      {
        title: t('admin.dashboard.stats.monthlyRevenue'),
        value: formatValue('monthly_revenue', dashboardStats.value.monthly_revenue.value),
        change: formatGrowth(dashboardStats.value.monthly_revenue.growth),
        changeType: getChangeType(dashboardStats.value.monthly_revenue.growth),
        icon: 'i-heroicons-currency-dollar-solid',
        gradient: 'from-emerald-500 to-teal-500',
        cardBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        showChange: true,
      },
      {
        title: t('admin.dashboard.stats.totalRevenue'),
        value: formatValue('total_revenue', dashboardStats.value.total_revenue.value),
        icon: 'i-heroicons-banknotes-solid',
        gradient: 'from-indigo-500 to-blue-500',
        cardBg: 'bg-gradient-to-br from-indigo-500 to-blue-500',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        showChange: false,
      },
      {
        title: t('admin.dashboard.stats.completionRate'),
        value: formatValue('completion_rate', dashboardStats.value.completion_rate.value),
        change: formatGrowth(dashboardStats.value.completion_rate.growth),
        changeType: getChangeType(dashboardStats.value.completion_rate.growth),
        icon: 'i-heroicons-chart-bar-solid',
        gradient: 'from-orange-500 to-red-500',
        cardBg: 'bg-gradient-to-br from-orange-500 to-red-500',
        iconBg: 'bg-white/20',
        iconColor: 'text-white',
        showChange: true,
      },
    ]
  })

  // Refresh dashboard stats
  async function refreshDashboardStats(): Promise<void> {
    await fetchDashboardStats()
  }

  // Redirect to admin dashboard if user is admin
  const redirectToAdmin = () => {
    if (isAdmin.value) {
      return navigateTo('/admin')
    }
  }

  // Redirect to appropriate dashboard based on role
  const redirectToDashboard = () => {
    if (!isLoggedIn.value) {
      return navigateTo('/auth/login')
    }

    switch (user.value?.role) {
      case 'admin':
        return navigateTo('/admin')
      case 'teacher':
        return navigateTo('/profile')
      default:
        return navigateTo('/')
    }
  }

  return {
    // Role and permission checks
    isAdmin,
    hasRole,
    hasAnyRole,
    isTeacherOrAdmin,
    canManageCourses,
    canAccessAdmin,

    // Dashboard stats
    dashboardStats: readonly(dashboardStats),
    statsCards,
    isLoadingStats: readonly(isLoadingStats),
    statsError: readonly(statsError),

    // Functions
    fetchDashboardStats,
    refreshDashboardStats,
    formatGrowth,
    formatValue,
    getChangeType,
    redirectToAdmin,
    redirectToDashboard,
  }
}
