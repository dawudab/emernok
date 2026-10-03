import { geohashForLocation } from 'geofire-common'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import {
  ANNOUNCEMENT_MAX_HOURS,
  MAX_ANNOUNCEMENT_LENGTH,
} from '../constants'

const ROLES = 'roles'
const ROLE_REQUESTS = 'roleRequests'
const ANNOUNCEMENTS = 'announcements'
const SOURCE_DRAFTS = 'sourceDrafts'
const ADMINS = 'admins'

export const ROLE_OFFICIAL = 'official'

/**
 * Admins are a Firestore collection rather than a hardcoded list so the team
 * can grow without a deploy. Nothing in the app can write to it: seed it from
 * the Firebase console.
 */
export async function isAdminUser(uid) {
  if (!db || !uid) return false
  try {
    return (await getDoc(doc(db, ADMINS, uid))).exists()
  } catch {
    // Rules deny the read for non-admins, which is itself the answer.
    return false
  }
}

export function subscribeToRole(uid, onRole, onError) {
  if (!db || !uid) return () => {}
  return onSnapshot(
    doc(db, ROLES, uid),
    (snap) => onRole(snap.exists() ? snap.data() : null),
    onError,
  )
}

export function subscribeToMyRequest(uid, onRequest, onError) {
  if (!db || !uid) return () => {}
  return onSnapshot(
    doc(db, ROLE_REQUESTS, uid),
    (snap) => onRequest(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError,
  )
}

export function submitRoleRequest({ uid, org, name, title, proof }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  return setDoc(doc(db, ROLE_REQUESTS, uid), {
    uid,
    org: org.trim(),
    name: name.trim(),
    title: title.trim(),
    proof: proof.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

// ---- moderation ------------------------------------------------------------

export function subscribeToPendingRequests(onRequests, onError) {
  if (!db) return () => {}
  const pending = query(
    collection(db, ROLE_REQUESTS),
    where('status', '==', 'pending'),
    limit(50),
  )
  return onSnapshot(
    pending,
    (snapshot) =>
      onRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

/**
 * Approval writes the role and closes the request together, so a half-applied
 * approval cannot leave someone with access but no audit trail.
 */
export function approveRequest({ request, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')

  const batch = writeBatch(db)
  batch.set(doc(db, ROLES, request.uid), {
    uid: request.uid,
    role: ROLE_OFFICIAL,
    org: request.org,
    name: request.name,
    approved: true,
    approvedBy: adminUid,
    approvedAt: serverTimestamp(),
  })
  batch.update(doc(db, ROLE_REQUESTS, request.uid), {
    status: 'approved',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  })
  return batch.commit()
}

export function rejectRequest({ request, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')
  return updateDoc(doc(db, ROLE_REQUESTS, request.uid), {
    status: 'rejected',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  })
}

// ---- announcements ---------------------------------------------------------

export function createAnnouncement({ uid, org, area, areaId, lat, lng, text, hours }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  const trimmed = text.trim()
  if (!trimmed) throw new Error('The notice is empty.')
  if (trimmed.length > MAX_ANNOUNCEMENT_LENGTH) {
    throw new Error(`Keep the notice under ${MAX_ANNOUNCEMENT_LENGTH} characters.`)
  }

  const span = Math.min(Math.max(Number(hours) || 1, 1), ANNOUNCEMENT_MAX_HOURS)

  return setDoc(doc(collection(db, ANNOUNCEMENTS)), {
    uid,
    org,
    area,
    areaId,
    lat,
    lng,
    geohash: geohashForLocation([lat, lng]),
    text: trimmed,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + span * 60 * 60 * 1000),
  })
}

export function subscribeToAnnouncements(onAnnouncements, onError) {
  if (!db) return () => {}

  // Expiry is an explicit field rather than an age cutoff: a four-hour repair
  // and a two-day one should not disappear at the same time.
  const active = query(
    collection(db, ANNOUNCEMENTS),
    where('expiresAt', '>', Timestamp.now()),
    orderBy('expiresAt', 'asc'),
    limit(50),
  )

  return onSnapshot(
    active,
    (snapshot) =>
      onAnnouncements(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

export function deleteAnnouncement(id) {
  if (!db) throw new Error('Firebase is not configured')
  return deleteDoc(doc(db, ANNOUNCEMENTS, id))
}

// ---- imported source drafts ------------------------------------------------

export function subscribeToDrafts(onDrafts, onError) {
  if (!db) return () => {}
  const pending = query(
    collection(db, SOURCE_DRAFTS),
    where('status', '==', 'pending'),
    orderBy('fetchedAt', 'desc'),
    limit(50),
  )
  return onSnapshot(
    pending,
    (snapshot) =>
      onDrafts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  )
}

/**
 * A draft is a suggestion, never a publication: a moderator turns it into a
 * real notice, which is what keeps a mis-parsed scrape off the map.
 */
export async function publishDraft({ draft, adminUid, area, hours }) {
  if (!db) throw new Error('Firebase is not configured')

  await createAnnouncement({
    uid: adminUid,
    org: draft.org,
    area: area.name,
    areaId: area.id,
    lat: area.lat,
    lng: area.lng,
    text: draft.text,
    hours,
  })

  return updateDoc(doc(db, SOURCE_DRAFTS, draft.id), {
    status: 'published',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  })
}

export function discardDraft({ draft, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')
  return updateDoc(doc(db, SOURCE_DRAFTS, draft.id), {
    status: 'discarded',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  })
}
