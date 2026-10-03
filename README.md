# Emernok — Nouakchott utility alerts

A mobile-first map of power, water and fuel outages in Nouakchott. Anyone can
read the map; reporting, posting and voting require a verified identity.

- **React + Vite + Tailwind**, Leaflet for the map, installable as a PWA.
- **Firebase** Auth (email link or phone) and Firestore.
- **Arabic (default, RTL), French and English**, switchable from the menu.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

Firebase keys live in `.env.local` (gitignored) — see `.env.example` for the
variable names.

## How trust works

| Who | Can do |
| --- | --- |
| Anyone | Read the map, outages and the neighbourhood feed |
| Verified user (email link or phone) | Report, post messages, vote |
| Verified utility worker | Everything above, plus publish official notices |
| Moderator | Approve worker applications, publish imported drafts |

Every one of these is enforced in `firestore.rules`, not just in the UI. An
unverified email can sign in but cannot write, which is what stops someone
claiming an address they do not own.

Reports are confirmed by the community: five different accounts reporting the
same utility within 500m turns a neighbourhood from yellow (unconfirmed) to red
(verified).

## Operating it

### 1. Make yourself a moderator

Moderators are documents in an `admins` collection that **nothing in the app can
write to**. Seed it by hand:

1. Open the app, sign in, open the profile panel and use **Copy my ID**.
2. In the Firebase console → Firestore, create collection `admins` with a
   document whose **ID is that uid**. Field contents are ignored.

A **Review queue** entry then appears in your menu.

### 2. Approving utility workers

Staff apply from **Utility worker access** in the menu. Their application lands
in the review queue with the organisation, role and whatever proof they offered.
Approving writes a `roles/{uid}` document; from then on they can publish notices
**only under their own organisation**.

### 3. Importing official announcements

`scripts/poll-sources.mjs` polls official pages and files anything resembling an
outage notice into `sourceDrafts` for review. **It never publishes**: a
mis-parsed press release would otherwise become a false official alert.

1. Add sources to `scripts/sources.json` (`id`, `org`, `url`, `type: rss|html`).
   Only add sources whose terms permit automated reading. **Facebook does not** —
   its terms forbid scraping and its pages sit behind a login wall.
2. Create a Firebase service account key (console → Project settings → Service
   accounts) and store the JSON as the `FIREBASE_SERVICE_ACCOUNT` repository
   secret on GitHub.
3. `.github/workflows/poll-sources.yml` runs every 30 minutes, or on demand.

Run it locally with:

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npm run poll:sources
```

## Deploying rules

```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```

## Known gaps

- Neighbourhood centres in `src/constants.js` are approximate.
- Hassaniya phrasing in `src/i18n/translations/ar.js` needs a native review.
- Expired reports and notices are hidden by query, not deleted; add a Firestore
  TTL policy or a cleanup job before the data grows.
