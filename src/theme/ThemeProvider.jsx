import { useCallback, useEffect, useMemo, useState } from 'react'
import { THEME_COLORS, ThemeContext } from './useTheme'

const STORAGE_KEY = 'emernok:theme'

function initialTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore storage errors in restricted browsing contexts.
  }
  return 'light'
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Ignore storage errors.
      }
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
