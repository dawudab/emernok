import {
  COMMUNITY_RADIUS_KM,
  DAILY_REPORT_LIMIT,
  REPORT_COOLDOWN_SECONDS,
  REPORT_TTL_HOURS,
  REPORT_TYPE_LIST,
  RESTORED_THRESHOLD,
  STATUS_COLORS,
  VERIFY_MIN_USERS,
  VERIFY_RADIUS_M,
} from '../constants'

function Swatch({ color, opacity }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 rounded-full border-2"
      style={{
        borderColor: color,
        background: color,
        opacity,
      }}
    />
  )
}

function Legend() {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-sm font-bold text-slate-900">Circle colour</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Colour shows how confirmed an outage is, not which utility it is.
        </p>
        <ul className="mt-3 space-y-3">
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.unverified} opacity={0.35} />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">Unconfirmed</span> — fewer than{' '}
              {VERIFY_MIN_USERS} people have reported it. Treat it as a rumour.
            </span>
          </li>
          <li className="flex gap-3">
            <Swatch color={STATUS_COLORS.verified} opacity={0.8} />
            <span className="text-sm text-slate-700">
              <span className="font-semibold">Verified Community Outage</span> —{' '}
              {VERIFY_MIN_USERS} different people within {VERIFY_RADIUS_M}m
              reported the same problem.
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">Pin icon</h3>
        <ul className="mt-3 space-y-2">
          {REPORT_TYPE_LIST.map((type) => (
            <li key={type.id} className="flex items-center gap-3 text-sm">
              <span aria-hidden="true" className="w-5 text-center text-base">
                {type.icon}
              </span>
              <span className="text-slate-700">{type.shortLabel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">Your position</h3>
        <p className="mt-1 text-sm text-slate-700">
          The small blue dot is you. It is never saved or shared — only the
          outages you choose to report are.
        </p>
      </section>
    </div>
  )
}

function About() {
  return (
    <div className="space-y-5 text-sm text-slate-700">
      <section>
        <h3 className="text-sm font-bold text-slate-900">Reporting</h3>
        <p className="mt-1">
          Tap a button at the bottom and your current location is used. If
          location is off, tap the map to place the pin yourself.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">
          Why reports disappear
        </h3>
        <p className="mt-1">
          Outages are news, not history. Pins drop off the map after{' '}
          {REPORT_TTL_HOURS} hours, or sooner once {RESTORED_THRESHOLD}{' '}
          neighbours confirm service is back.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">
          Confirming and clearing
        </h3>
        <p className="mt-1">
          Tap any outage and choose <span className="font-semibold">Still
          Out</span> or <span className="font-semibold">It&apos;s Back</span>.
          One vote per person per outage, and a vote cannot be changed — that is
          what keeps the count honest.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">Community feed</h3>
        <p className="mt-1">
          Messages are only visible to people within {COMMUNITY_RADIUS_KM}km, so
          the feed stays about your own neighbourhood.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900">Limits</h3>
        <p className="mt-1">
          Anyone can read the map. Reporting, posting and voting need a verified
          email or phone number, with one report every{' '}
          {REPORT_COOLDOWN_SECONDS} seconds and up to {DAILY_REPORT_LIMIT} per
          day. These limits are enforced on the server, not just in the app.
        </p>
      </section>
    </div>
  )
}

function InfoPanel({ view, onClose }) {
  const legend = view === 'legend'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={legend ? 'Map legend' : 'How it works'}
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-900">
            {legend ? 'Map legend' : 'How it works'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-11 min-w-11 shrink-0 rounded-xl bg-slate-100 font-semibold text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {legend ? <Legend /> : <About />}
        </div>
      </div>
    </div>
  )
}

export default InfoPanel
