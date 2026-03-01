const STORAGE_KEY = 'app_timezone'

const TIMEZONE_OPTIONS = [
  { label: '🇻🇳 Việt Nam', value: 'Asia/Ho_Chi_Minh' },
  { label: '🇮🇹 Italia', value: 'Europe/Rome' },
] as const

export function useTimezone() {
  const selectedTimezone = useState<string>('app_timezone', () => {
    if (import.meta.client) {
      return localStorage.getItem(STORAGE_KEY) || 'Asia/Ho_Chi_Minh'
    }
    return 'Asia/Ho_Chi_Minh'
  })

  watch(selectedTimezone, (val) => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, val)
    }
  })

  return {
    TIMEZONE_OPTIONS,
    selectedTimezone,
  }
}
