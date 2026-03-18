import { useHomeworkApi } from '~/composables/api/useHomeworkApi'

const ADMIN_HOMEWORK_SUBMISSIONS_COUNT_KEY = 'admin-homework-submissions-pending-count'

/**
 * Composable to fetch admin homework submissions pending count for sidebar badge.
 * Uses shared state so refresh from any page updates the badge.
 * Only fetches when enabled and user is admin.
 */
export function useAdminHomeworkSubmissionsCount(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const { isAdmin } = useAdmin()
  const { getAdminHomeworkSubmissionCount } = useHomeworkApi()

  const pendingCount = useState(ADMIN_HOMEWORK_SUBMISSIONS_COUNT_KEY, () => 0)

  async function fetchCount() {
    if (!enabled || !isAdmin.value || !import.meta.client)
      return
    try {
      const data = await getAdminHomeworkSubmissionCount()
      pendingCount.value = data?.pending ?? 0
    }
    catch {
      pendingCount.value = 0
    }
  }

  onMounted(() => {
    fetchCount()
  })

  return {
    pendingCount: readonly(pendingCount),
    refreshCount: fetchCount,
  }
}
