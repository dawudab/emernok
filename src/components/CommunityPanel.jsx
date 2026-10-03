import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_RADIUS_KM } from '../constants'
import { useAuth } from '../context/useAuth'
import { useNearbyMessages } from '../hooks/useNearbyMessages'
import { MAX_MESSAGE_LENGTH, sendMessage } from '../services/messages'

function formatTime(createdAt) {
  if (!createdAt?.toDate) return 'Sending…'
  return createdAt.toDate().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDistance(metres) {
  if (metres == null) return ''
  return metres < 1000 ? `${Math.round(metres)}m` : `${(metres / 1000).toFixed(1)}km`
}

function CommunityPanel({ onClose, position, onRequestSignIn }) {
  const { uid, canWrite, isAnonymous } = useAuth()
  const { messages, error } = useNearbyMessages(position)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Community feed"
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex h-[80dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Neighbourhood</h2>
            <p className="text-xs text-slate-500">
              Messages within {COMMUNITY_RADIUS_KM}km of you
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close community feed"
            className="min-h-11 min-w-11 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!position && (
            <p className="text-sm text-slate-500">
              Location is needed to show nearby messages. Enable location access
              and reopen this panel.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              Could not load messages: {error.message}
            </p>
          )}
          {position && !error && messages.length === 0 && (
            <p className="text-sm text-slate-500">
              No messages nearby yet. Start the conversation.
            </p>
          )}

          {messages.map((message) => {
            const mine = message.uid === uid
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  mine ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p
                  className={`mt-1 text-[11px] ${mine ? 'text-slate-300' : 'text-slate-500'}`}
                >
                  {formatTime(message.createdAt)} · {formatDistance(message.distance)} away
                </p>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-200 p-3">
          {!canWrite ? (
            <button
              type="button"
              onClick={onRequestSignIn}
              className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white"
            >
              {isAnonymous ? 'Sign in to post' : 'Verify your email to post'}
            </button>
          ) : (
            <form onSubmit={submit} className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                disabled={!position}
                placeholder="Did anyone else hear the transformer blow?"
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-3 text-base"
              />
              <button
                type="submit"
                disabled={busy || !text.trim() || !position}
                className="min-h-12 shrink-0 rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:opacity-50"
              >
                {busy ? '…' : 'Send'}
              </button>
            </form>
          )}
          {sendError && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {sendError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommunityPanel
