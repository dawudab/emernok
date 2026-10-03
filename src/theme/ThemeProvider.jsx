import { useEffect, useMemo, useState } from 'react'
import { THEME_COLORS, ThemeContext, themeForDate } from './useTheme'

// Checking every minute is enough to flip within a minute of 18:00 or 06:00
// without keeping a long timer that a suspended phone would never fire.
const TICK_MS = 60 * 1000

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => themeForDate())

  useEffect(() => {
    const sync = () => setTheme(themeForDate())

    const interval = setInterval(sync, TICK_MS)
    // A phone that slept through dusk resumes on a stale theme, so re-check
    // whenever the tab becomes visible again.
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark' }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
