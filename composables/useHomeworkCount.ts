import { useHomeworkApi } from '~/composables/api/useHomeworkApi'

const HOMEWORK_COUNT_KEY = 'homework-pending-count'

/**
 * Composable to fetch homework pending count for student sidebar badge.
 * Uses shared state so refresh from any page updates the badge.
 * Only fetches when enabled and user is logged in (student).
 */
export function useHomeworkCount(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const { isLoggedIn } = useAuth()
  const { getStudentHomeworkCount } = useHomeworkApi()

  const pendingCount = useState(HOMEWORK_COUNT_KEY, () => 0)

  async function fetchCount() {
    if (!enabled || !isLoggedIn.value || !import.meta.client)
      return
    try {
      const data = await getStudentHomeworkCount()
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
