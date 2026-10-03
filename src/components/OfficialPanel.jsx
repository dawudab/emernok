import { useState } from 'react'
import {
  ANNOUNCEMENT_DEFAULT_HOURS,
  ANNOUNCEMENT_MAX_HOURS,
  MAX_ANNOUNCEMENT_LENGTH,
  NEIGHBOURHOODS,
  OFFICIAL_COLOR,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useOfficial } from '../hooks/useOfficial'
import { useT } from '../i18n/useI18n'
import { createAnnouncement, submitRoleRequest } from '../services/officials'
import SignInPanel from './SignInPanel'

function ApplicationForm({ uid, onSent }) {
  const t = useT()
  const [form, setForm] = useState({ org: '', name: '', title: '', proof: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const fields = [
    { key: 'org', label: t('official.orgLabel'), placeholder: t('official.orgPlaceholder') },
    { key: 'name', label: t('official.nameLabel') },
    { key: 'title', label: t('official.roleLabel'), placeholder: t('official.rolePlaceholder') },
  ]

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await submitRoleRequest({ uid, ...form })
          onSent?.()
        } catch (submitError) {
          setError(submitError.message)
        } finally {
          setBusy(false)
        }
      }}
    >
      {fields.map((field) => (
        <label
          key={field.key}
          className="block text-sm font-medium text-slate-700"
        >
          {field.label}
          <input
            value={form[field.key]}
            onChange={set(field.key)}
            placeholder={field.placeholder}
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
          />
        </label>
      ))}

      <label className="block text-sm font-medium text-slate-700">
        {t('official.proofLabel')}
        <textarea
          value={form.proof}
          onChange={set('proof')}
          rows={3}
          placeholder={t('official.proofPlaceholder')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !form.org.trim() || !form.name.trim() || !form.proof.trim()}
        className="min-h-12 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:opacity-50"
      >
        {busy ? t('common.working') : t('official.submit')}
      </button>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}

function NoticeForm({ uid, org }) {
  const t = useT()
  const [areaId, setAreaId] = useState(NEIGHBOURHOODS[0].id)
  const [text, setText] = useState('')
  const [hours, setHours] = useState(ANNOUNCEMENT_DEFAULT_HOURS)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError(null)
        setDone(false)
        try {
          const area = NEIGHBOURHOODS.find((entry) => entry.id === areaId)
          await createAnnouncement({
            uid,
            org,
            area: area.name,
            areaId: area.id,
            lat: area.lat,
            lng: area.lng,
            text,
            hours,
          })
          setText('')
          setDone(true)
        } catch (postError) {
          setError(postError.message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <h3 className="text-sm font-bold text-slate-900">
        {t('official.postTitle')}
      </h3>

      <label className="block text-sm font-medium text-slate-700">
        {t('official.areaLabel')}
        <select
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        >
          {NEIGHBOURHOODS.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        {t('official.messageLabel')}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={MAX_ANNOUNCEMENT_LENGTH}
          placeholder={t('official.messagePlaceholder')}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        {t('official.durationLabel')}
        <input
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          type="number"
          min={1}
          max={ANNOUNCEMENT_MAX_HOURS}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="min-h-12 w-full rounded-xl font-semibold text-white disabled:opacity-50"
        style={{ background: OFFICIAL_COLOR }}
      >
        {busy ? t('common.working') : t('official.post')}
      </button>

      {done && (
        <p className="text-sm font-medium text-emerald-700">
          {t('official.posted')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}

function OfficialPanel({ onClose }) {
  const { uid, canWrite } = useAuth()
  const { role, request, isOfficial } = useOfficial(uid)
  const t = useT()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('official.title')}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t('official.title')}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('official.intro')}
            </p>
          </div>
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
          {!canWrite && (
            <>
              <p className="mb-4 text-sm text-slate-700">
                {t('official.signedOut')}
              </p>
              <SignInPanel onDone={onClose} />
            </>
          )}

          {canWrite && isOfficial && (
            <>
              <p className="mb-4 rounded-xl bg-violet-50 p-3 text-sm font-medium text-violet-900">
                {t('official.approved', { org: role.org })}
              </p>
              <NoticeForm uid={uid} org={role.org} />
            </>
          )}

          {canWrite && !isOfficial && request?.status === 'pending' && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {t('official.pending')}
            </p>
          )}

          {canWrite && !isOfficial && request?.status === 'rejected' && (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
              {t('official.rejected')}
            </p>
          )}

          {canWrite && !isOfficial && !request && <ApplicationForm uid={uid} />}
        </div>
      </div>
    </div>
  )
}

export default OfficialPanel
