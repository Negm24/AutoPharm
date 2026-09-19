import { useTranslation } from 'react-i18next'

export interface Direction {
  lang: 'en' | 'ar'
  isRtl: boolean
  dir: 'rtl' | 'ltr'
}

/**
 * Replaces the `i18n.language === 'ar'` check that was being rewritten on every screen.
 * The codebase mirrors layout with an explicit `dir`, not with Tailwind logical
 * utilities, so components read `dir` from here and pass it to the elements that need it.
 */
export function useDirection(): Direction {
  const { i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('ar')
  return { lang: isRtl ? 'ar' : 'en', isRtl, dir: isRtl ? 'rtl' : 'ltr' }
}
