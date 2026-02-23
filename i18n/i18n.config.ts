import en from './locales/en/index'
import it from './locales/it/index'
import vi from './locales/vi/index'

export default defineI18nConfig(() => {
  const currentLocale = useCookie('locale', {
    default: () => 'vi',
  })
  console.log(currentLocale.value)
  return {
    locale: currentLocale.value,
    messages: {
      en,
      vi,
      it,
    },
  }
})
