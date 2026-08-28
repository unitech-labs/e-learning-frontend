/**
 * Phát âm tiếng Ý bằng Web Speech API của trình duyệt.
 * Backend không làm TTS nên không có API audio, xem docs FLASHCARD_API.md mục 9.
 */
export function useItalianSpeech() {
  const isSupported = ref(false)
  const hasItalianVoice = ref(false)
  const speakingText = ref('')

  let italianVoice: SpeechSynthesisVoice | null = null

  function pickItalianVoice() {
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length)
      return
    italianVoice = voices.find(voice => voice.lang.toLowerCase().startsWith('it')) ?? null
    hasItalianVoice.value = Boolean(italianVoice)
  }

  onMounted(() => {
    isSupported.value = typeof window !== 'undefined' && 'speechSynthesis' in window
    if (!isSupported.value)
      return

    // Chrome trả mảng rỗng ở lần gọi getVoices() đầu tiên, phải chờ voiceschanged.
    pickItalianVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickItalianVoice)
  })

  onBeforeUnmount(() => {
    if (!isSupported.value)
      return
    window.speechSynthesis.removeEventListener('voiceschanged', pickItalianVoice)
    window.speechSynthesis.cancel()
  })

  function speak(text: string) {
    if (!isSupported.value || !text)
      return

    // Huỷ câu đang đọc trước khi đọc câu mới.
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'it-IT'
    utterance.rate = 0.9 // chậm lại chút cho người học
    // Máy không có giọng Ý thì để trình duyệt tự chọn giọng mặc định.
    if (italianVoice)
      utterance.voice = italianVoice

    speakingText.value = text
    utterance.onend = () => {
      if (speakingText.value === text)
        speakingText.value = ''
    }
    utterance.onerror = () => {
      if (speakingText.value === text)
        speakingText.value = ''
    }

    window.speechSynthesis.speak(utterance)
  }

  function stop() {
    if (!isSupported.value)
      return
    window.speechSynthesis.cancel()
    speakingText.value = ''
  }

  return {
    isSupported,
    hasItalianVoice,
    speakingText,
    speak,
    stop,
  }
}
