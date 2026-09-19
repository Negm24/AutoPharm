import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import ar from './locales/ar'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
