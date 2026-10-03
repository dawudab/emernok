import { createContext, useContext } from 'react'

export const DARK_FROM_HOUR = 18
export const DARK_UNTIL_HOUR = 6

// Matches the body colours in index.css so the browser chrome does not clash
// with the app while scrolling.
export const THEME_COLORS = { light: '#f4f4f5', dark: '#09090b' }

export function themeForDate(date = new Date()) {
  const hour = date.getHours()
  return hour >= DARK_FROM_HOUR || hour < DARK_UNTIL_HOUR ? 'dark' : 'light'
}

export const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}
