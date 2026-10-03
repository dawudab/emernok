import { useEffect, useState } from 'react'
import { ANNOUNCEMENT_DEFAULT_HOURS, NEIGHBOURHOODS } from '../constants'
import { useAuth } from '../context/useAuth'
import { useT } from '../i18n/useI18n'
import {
  approveRequest,
  discardDraft,
  publishDraft,
  rejectRequest,
  subscribeToDrafts,
  subscribeToPendingRequests,
} from '../services/officials'

function DraftRow({ draft, adminUid }) {
  const t = useT()
  // A scraper can guess the neighbourhood, but a human confirms it before it
  // reaches the map.
  const [areaId, setAreaId] = useState(
    draft.areaId ?? NEIGHBOURHOODS[0].id,
  )
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

  return (
    <li className="space-y-2 py-3">
      <p className="text-sm text-slate-800">{draft.text}</p>
      <p className="text-xs text-slate-500">
        {t('admin.source', { source: draft.source ?? draft.org })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
          className="min-h-10 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
        >
          {NEIGHBOURHOODS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
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
          className="min-h-10 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t('common.publish')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => discardDraft({ draft, adminUid }))}
          className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {t('common.discard')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </li>
  )
}

function RequestRow({ request, adminUid }) {
  const t = useT()
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

  return (
    <li className="space-y-2 py-3">
      <p className="text-sm font-semibold text-slate-900">
        {request.name} · {request.org}
      </p>
      <p className="text-xs text-slate-600">{request.title}</p>
      <p className="text-xs text-slate-500">{request.proof}</p>
      <p className="font-mono text-[11px] text-slate-400">{request.uid}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => approveRequest({ request, adminUid }))}
          className="min-h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t('common.approve')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => rejectRequest({ request, adminUid }))}
          className="min-h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          {t('common.reject')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.title')}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900">
            {t('admin.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="min-h-11 min-w-11 shrink-0 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mb-3 text-sm font-medium text-red-600">
              {error.message}
            </p>
          )}

          <h3 className="text-sm font-bold text-slate-900">
            {t('admin.applications')}
          </h3>
          {requests.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              {t('admin.noApplications')}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  adminUid={uid}
                />
              ))}
            </ul>
          )}

          <h3 className="mt-6 text-sm font-bold text-slate-900">
            {t('admin.drafts')}
          </h3>
          {drafts.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">{t('admin.noDrafts')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {drafts.map((draft) => (
                <DraftRow key={draft.id} draft={draft} adminUid={uid} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
