import { useCallback, useEffect, useMemo, useState } from 'react'
import ar from './translations/ar'
import en from './translations/en'
import fr from './translations/fr'
import { DEFAULT_LANGUAGE, I18nContext, LANGUAGES } from './useI18n'

const DICTIONARIES = { ar, fr, en }
const STORAGE_KEY = 'nem:user-lang-v2'

function initialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && DICTIONARIES[stored]) return stored
  // Arabic is always the default language unless the user explicitly switches it.
  return DEFAULT_LANGUAGE
}

function interpolate(template, vars) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  )
}

function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLanguage)

  const dir = LANGUAGES.find((entry) => entry.id === lang)?.dir ?? 'rtl'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [dir, lang])

  const t = useCallback(
    (key, vars) => {
      const dictionary = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANGUAGE]
      const template = dictionary[key] ?? ar[key] ?? en[key]
      if (template == null) {
        if (import.meta.env.DEV) console.warn(`Missing translation: ${key}`)
        return key
      }
      return interpolate(template, vars)
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, dir, setLang, t }), [dir, lang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
