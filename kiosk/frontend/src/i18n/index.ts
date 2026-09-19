import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import ar from './locales/ar'
import authEn from '../features/auth/i18n/en'
import authAr from '../features/auth/i18n/ar'
import catalogueEn from '../features/catalogue/i18n/en'
import catalogueAr from '../features/catalogue/i18n/ar'
import symptomsEn from '../features/symptoms/i18n/en'
import symptomsAr from '../features/symptoms/i18n/ar'

type Bundle = Readonly<Record<string, unknown>>

/**
 * Composition seam. `locales/{en,ar}.ts` hold the shell and shared chrome keys; every
 * feature owns `features/<name>/i18n/{en,ar}.ts` and is merged in here under the same
 * `kiosk` namespace. Adding a feature is one import pair and one argument, so three
 * people are never editing the same translation file.
 */
function compose(base: { readonly kiosk: Bundle }, ...parts: Bundle[]) {
  return { kiosk: Object.assign({}, base.kiosk, ...parts) }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: compose(en, authEn, catalogueEn, symptomsEn) },
    ar: { translation: compose(ar, authAr, catalogueAr, symptomsAr) },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
