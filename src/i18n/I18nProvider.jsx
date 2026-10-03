import { useCallback, useEffect, useMemo, useState } from 'react'
import ar from './translations/ar'
import en from './translations/en'
import fr from './translations/fr'
import { DEFAULT_LANGUAGE, I18nContext, LANGUAGES } from './useI18n'

const DICTIONARIES = { ar, fr, en }
const STORAGE_KEY = 'emernok:lang'

function initialLanguage() {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && DICTIONARIES[stored]) return stored

  // Respect the browser only when it asks for a language we actually have;
  // otherwise Arabic stays the default.
  const preferred = window.navigator.languages ?? [window.navigator.language]
  for (const tag of preferred) {
    const base = tag?.split('-')[0]
    if (DICTIONARIES[base]) return base
  }
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

  const dir = LANGUAGES.find((entry) => entry.id === lang)?.dir ?? 'ltr'

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
    // Leaflet, form controls and the whole layout key off these, so they have
    // to be set on the document rather than a wrapper element.
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [dir, lang])

  const t = useCallback(
    (key, vars) => {
      const dictionary = DICTIONARIES[lang] ?? DICTIONARIES[DEFAULT_LANGUAGE]
      // Falling back to English keeps a half-translated string visible rather
      // than leaking a raw key into the UI.
      const template = dictionary[key] ?? en[key]
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
