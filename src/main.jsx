import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import I18nProvider from './i18n/I18nProvider.jsx'
import ThemeProvider from './theme/ThemeProvider.jsx'

// Register the Workbox service worker immediately so the app shell, map tiles,
// and cached outage reports remain available on poor or offline connections.
// Provide onNeedReload no-op to prevent automatic window.location.reload() loops on mobile.
registerSW({
  immediate: true,
  onNeedReload() {},
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
