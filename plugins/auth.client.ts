/**
 * Get raw hardware data for device identification.
 * BE will hash this into a hardware_signature.
 */
export function getDeviceProfile() {
  return {
    platform: navigator.platform || '',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    screenWidth: screen.width || 0,
    screenHeight: screen.height || 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth || 24,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  }
}

/**
 * Get a human-readable device name for display purposes.
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent
  let device = 'Unknown'
  let browser = 'Unknown'

  // Detect device
  if (/iPhone/.test(ua)) device = 'iPhone'
  else if (/iPad/.test(ua)) device = 'iPad'
  else if (/Android/.test(ua)) {
    const match = ua.match(/;\s*([\w\s]+)\s*Build/)
    device = match ? match[1].trim() : 'Android'
  }
  else if (/Macintosh/.test(ua)) device = 'macOS'
  else if (/Windows/.test(ua)) device = 'Windows'
  else if (/Linux/.test(ua)) device = 'Linux'

  // Detect browser
  if (/Zalo/.test(ua)) browser = 'Zalo'
  else if (/FBAN|FBAV/.test(ua)) browser = 'Facebook'
  else if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Edg/.test(ua)) browser = 'Edge'

  return `${device} - ${browser}`
}

export default defineNuxtPlugin(async () => {
  // Force HTTPS in production (client-side) to ensure secure cookies work across browsers/in-app browsers
  if (!import.meta.dev && window.location.protocol === 'http:') {
    const newUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(newUrl)
    return
  }

  // Initialize authentication state on client-side
  const { initAuth, fetchProfile, isLoggedIn } = useAuth()

  await initAuth()
  if (isLoggedIn.value) {
    await fetchProfile()
  }
})
