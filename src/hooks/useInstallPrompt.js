import { useEffect, useState } from 'react'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari's non-standard flag for home-screen apps.
    window.navigator.standalone === true
  )
}

function isIos() {
  const ua = window.navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so also check for touch support.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  )
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      // Chrome only shows its own mini-infobar if we don't preventDefault.
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) return null
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    // The event can only be used once.
    setPromptEvent(null)
    return outcome
  }

  const ios = isIos()

  return {
    install,
    installed,
    ios,
    // Android/desktop Chrome gives us an event; iOS never does, so we fall back
    // to showing manual instructions.
    canPrompt: Boolean(promptEvent),
    available: !installed && (Boolean(promptEvent) || ios),
  }
}
