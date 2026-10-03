import { createContext, useContext } from 'react'

// Arabic first: it is the language most residents read, and making it the
// default (rather than an option buried in a menu) is the difference between
// feeling like a local tool and a translated one.
export const LANGUAGES = [
  { id: 'ar', label: 'العربية', dir: 'rtl' },
  { id: 'fr', label: 'Français', dir: 'ltr' },
  { id: 'en', label: 'English', dir: 'ltr' },
]

export const DEFAULT_LANGUAGE = 'ar'

export const I18nContext = createContext({
  lang: DEFAULT_LANGUAGE,
  dir: 'rtl',
  setLang: () => {},
  t: (key) => key,
})

export function useI18n() {
  return useContext(I18nContext)
}

export function useT() {
  return useContext(I18nContext).t
}
