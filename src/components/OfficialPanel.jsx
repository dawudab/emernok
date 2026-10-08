import { useState } from 'react'
import {
  ANNOUNCEMENT_DEFAULT_HOURS,
  ANNOUNCEMENT_MAX_HOURS,
  MAX_ANNOUNCEMENT_LENGTH,
  NEIGHBOURHOODS,
  OFFICIAL_COLOR,
  getLocalName,
} from '../constants'
import { useAuth } from '../context/useAuth'
import { useOfficial } from '../hooks/useOfficial'
import { useI18n, useT } from '../i18n/useI18n'
import { createAnnouncement, submitRoleRequest } from '../services/officials'
import Sheet from './Sheet'
import SignInPanel from './SignInPanel'

function Label({ children }) {
  return (
    <span className="mb-1 block font-mono text-[10px] font-semibold tracking-[0.15em] text-zinc-500 uppercase dark:text-zinc-400">
      {children}
    </span>
  )
}

function ApplicationForm({ uid }) {
  const t = useT()
  const [form, setForm] = useState({ org: '', name: '', title: '', proof: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (event) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }))

  const fields = [
    {
      key: 'org',
      label: t('official.orgLabel'),
      placeholder: t('official.orgPlaceholder'),
    },
    { key: 'name', label: t('official.nameLabel') },
    {
      key: 'title',
      label: t('official.roleLabel'),
      placeholder: t('official.rolePlaceholder'),
    },
  ]

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError(null)
        try {
          await submitRoleRequest({ uid, ...form })
        } catch (submitError) {
          setError(submitError.message)
        } finally {
          setBusy(false)
        }
      }}
    >
      {fields.map((field) => (
        <label key={field.key} className="block">
          <Label>{field.label}</Label>
          <input
            value={form[field.key]}
            onChange={set(field.key)}
            placeholder={field.placeholder}
            className="glass-input min-h-12"
          />
        </label>
      ))}

      <label className="block">
        <Label>{t('official.proofLabel')}</Label>
        <textarea
          value={form.proof}
          onChange={set('proof')}
          rows={3}
          placeholder={t('official.proofPlaceholder')}
          className="glass-input py-2"
        />
      </label>

      <button
        type="submit"
        disabled={
          busy || !form.org.trim() || !form.name.trim() || !form.proof.trim()
        }
        className="btn-primary min-h-12 w-full rounded-full"
      >
        {busy ? t('common.working') : t('official.submit')}
      </button>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-500">
          {error}
        </p>
      )}
    </form>
  )
}

function NoticeForm({ uid, org }) {
  const { t, lang } = useI18n()
  const [areaId, setAreaId] = useState(NEIGHBOURHOODS[0].id)
  const [text, setText] = useState('')
  const [hours, setHours] = useState(ANNOUNCEMENT_DEFAULT_HOURS)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  return (
    <form
      className="space-y-4"
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
      <h3 className="font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
        {t('official.postTitle')}
      </h3>

      <label className="block">
        <Label>{t('official.areaLabel')}</Label>
        <select
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
          className="glass-input min-h-12"
        >
          {NEIGHBOURHOODS.map((area) => (
            <option key={area.id} value={area.id}>
              {getLocalName(area, lang)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <Label>{t('official.messageLabel')}</Label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={MAX_ANNOUNCEMENT_LENGTH}
          placeholder={t('official.messagePlaceholder')}
          className="glass-input py-2"
        />
      </label>

      <label className="block">
        <Label>{t('official.durationLabel')}</Label>
        <input
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          type="number"
          min={1}
          max={ANNOUNCEMENT_MAX_HOURS}
          className="glass-input tabular min-h-12"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="min-h-12 w-full rounded-full font-semibold text-white transition-all duration-300 disabled:opacity-40"
        style={{
          background: OFFICIAL_COLOR,
          boxShadow: `0 0 24px ${OFFICIAL_COLOR}55`,
        }}
      >
        {busy ? t('common.working') : t('official.post')}
      </button>

      {done && (
        <p className="text-sm font-medium text-emerald-500">
          {t('official.posted')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-500">
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
    <Sheet
      title={t('official.title')}
      subtitle={t('official.intro')}
      onClose={onClose}
    >
      {!canWrite && (
        <>
          <p className="mb-4 text-sm">{t('official.signedOut')}</p>
          <SignInPanel onDone={onClose} />
        </>
      )}

      {canWrite && isOfficial && (
        <>
          <p
            className="mb-4 rounded-2xl px-3 py-2.5 text-sm font-medium"
            style={{
              background: `${OFFICIAL_COLOR}1f`,
              border: `1px solid ${OFFICIAL_COLOR}55`,
            }}
          >
            {t('official.approved', { org: role.org })}
          </p>
          <NoticeForm uid={uid} org={role.org} />
        </>
      )}

      {canWrite && !isOfficial && request?.status === 'pending' && (
        <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          {t('official.pending')}
        </p>
      )}

      {canWrite && !isOfficial && request?.status === 'rejected' && (
        <p className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {t('official.rejected')}
        </p>
      )}

      {canWrite && !isOfficial && !request && <ApplicationForm uid={uid} />}
    </Sheet>
  )
}

export default OfficialPanel
