import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_RADIUS_KM } from '../constants'
import { useAuth } from '../context/useAuth'
import { useNearbyMessages } from '../hooks/useNearbyMessages'
import { useT } from '../i18n/useI18n'
import { MAX_MESSAGE_LENGTH, sendMessage } from '../services/messages'
import Sheet from './Sheet'

function formatDistance(metres) {
  if (metres == null) return ''
  return metres < 1000
    ? `${Math.round(metres)}m`
    : `${(metres / 1000).toFixed(1)}km`
}

function CommunityPanel({ onClose, position, onRequestSignIn }) {
  const { uid, canWrite, isAnonymous } = useAuth()
  const { messages, error } = useNearbyMessages(position)
  const t = useT()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const formatTime = (createdAt) =>
    createdAt?.toDate
      ? createdAt.toDate().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : t('popup.sending')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setSendError(null)
    try {
      await sendMessage({ uid, text, lat: position.lat, lng: position.lng })
      setText('')
    } catch (error) {
      setSendError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const composer = !canWrite ? (
    <button
      type="button"
      onClick={onRequestSignIn}
      className="btn-primary min-h-12 w-full rounded-full"
    >
      {isAnonymous ? t('community.signIn') : t('community.verify')}
    </button>
  ) : (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={1}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={!position}
        placeholder={t('community.placeholder')}
        className="glass-input min-h-12 flex-1 resize-none py-3"
      />
      <button
        type="submit"
        disabled={busy || !text.trim() || !position}
        className="btn-primary min-h-12 shrink-0 rounded-full px-5"
      >
        {busy ? '…' : t('common.send')}
      </button>
    </form>
  )

  return (
    <Sheet
      tall
      title={t('community.title')}
      subtitle={t('community.subtitle', { km: COMMUNITY_RADIUS_KM })}
      onClose={onClose}
      footer={
        <>
          {composer}
          {sendError && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-500">
              {sendError}
            </p>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {!position && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('community.needLocation')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-red-500">
            {t('community.loadFailed', { message: error.message })}
          </p>
        )}
        {position && !error && messages.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('community.empty')}
          </p>
        )}

        {messages.map((message) => {
          const mine = message.uid === uid
          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 transition-all duration-300 ${
                mine
                  ? 'ms-auto bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'glass-inset'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className="tabular mt-1 text-[11px] opacity-60">
                {formatTime(message.createdAt)} ·{' '}
                {t('community.away', {
                  distance: formatDistance(message.distance),
                })}
              </p>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </Sheet>
  )
}

export default CommunityPanel
