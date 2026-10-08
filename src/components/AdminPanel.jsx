import { useEffect, useState } from 'react'
import {
  ANNOUNCEMENT_DEFAULT_HOURS,
  NEIGHBOURHOODS,
  getLocalName,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useI18n, useT } from '../i18n/useI18n'
import {
  approveRequest,
  discardDraft,
  publishDraft,
  rejectRequest,
  subscribeToDrafts,
  subscribeToPendingRequests,
} from '../services/officials'
import Sheet from './Sheet'

function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const act = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, act }
}

function Heading({ children }) {
  return (
    <h3 className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
      {children}
    </h3>
  )
}

function DraftRow({ draft, adminUid }) {
  const { t, lang } = useI18n()
  // A scraper can guess the neighbourhood, but a human confirms it before it
  // reaches the map.
  const [areaId, setAreaId] = useState(draft.areaId ?? NEIGHBOURHOODS[0].id)
  const { busy, error, act } = useAction()

  return (
    <li className="space-y-2 py-3">
      <p className="text-sm">{draft.text}</p>
      <p className="tabular text-xs text-zinc-500 dark:text-zinc-400">
        {t('admin.source', { source: draft.source ?? draft.org })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
          className="glass-input min-h-10 flex-1 text-sm"
        >
          {NEIGHBOURHOODS.map((area) => (
            <option key={area.id} value={area.id}>
              {getLocalName(area, lang)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(() =>
              publishDraft({
                draft,
                adminUid,
                area: NEIGHBOURHOODS.find((entry) => entry.id === areaId),
                hours: ANNOUNCEMENT_DEFAULT_HOURS,
              }),
            )
          }
          className="btn-primary min-h-10 rounded-full px-4 text-sm"
        >
          {t('common.publish')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => discardDraft({ draft, adminUid }))}
          className="btn-ghost min-h-10 rounded-full px-4 text-sm"
        >
          {t('common.discard')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </li>
  )
}

function RequestRow({ request, adminUid }) {
  const t = useT()
  const { busy, error, act } = useAction()

  return (
    <li className="space-y-2 py-3">
      <p className="text-sm font-semibold">
        {request.name} · {request.org}
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {request.title}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {request.proof}
      </p>
      <p className="tabular text-[11px] text-zinc-400 dark:text-zinc-500">
        {request.uid}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => approveRequest({ request, adminUid }))}
          className="min-h-10 flex-1 rounded-full bg-emerald-500 text-sm font-semibold text-white transition-all duration-300 disabled:opacity-40"
        >
          {t('common.approve')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => rejectRequest({ request, adminUid }))}
          className="btn-ghost min-h-10 flex-1 rounded-full text-sm"
        >
          {t('common.reject')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </li>
  )
}

function AdminPanel({ onClose }) {
  const { uid } = useAuth()
  const t = useT()
  const [requests, setRequests] = useState([])
  const [drafts, setDrafts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const stopRequests = subscribeToPendingRequests(setRequests, setError)
    const stopDrafts = subscribeToDrafts(setDrafts, setError)
    return () => {
      stopRequests()
      stopDrafts()
    }
  }, [])

  return (
    <Sheet title={t('admin.title')} onClose={onClose}>
      {error && (
        <p role="alert" className="mb-3 text-sm font-medium text-red-500">
          {error.message}
        </p>
      )}

      <Heading>{t('admin.applications')}</Heading>
      {requests.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t('admin.noApplications')}
        </p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {requests.map((request) => (
            <RequestRow key={request.id} request={request} adminUid={uid} />
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Heading>{t('admin.drafts')}</Heading>
      </div>
      {drafts.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t('admin.noDrafts')}
        </p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {drafts.map((draft) => (
            <DraftRow key={draft.id} draft={draft} adminUid={uid} />
          ))}
        </ul>
      )}
    </Sheet>
  )
}

export default AdminPanel
