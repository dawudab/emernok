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
import { OperationType, auth, db, handleFirestoreError } from '../firebaseConfig'
import {
  ANNOUNCEMENT_MAX_HOURS,
  MAX_ANNOUNCEMENT_LENGTH,
} from '../constants'

const ROLES = 'roles'
const ROLE_REQUESTS = 'roleRequests'
const ANNOUNCEMENTS = 'announcements'
const SOURCE_DRAFTS = 'sourceDrafts'
const ADMINS = 'admins'
const BOOTSTRAP_ADMIN_EMAIL = 'davionbase@gmail.com'

export const ROLE_OFFICIAL = 'official'

function isPermissionError(error) {
  return (
    error?.code === 'permission-denied' ||
    error?.message?.includes('Missing or insufficient permissions')
  )
}

function toMillis(value) {
  return value?.toMillis?.() ?? 0
}

/**
 * Admins are a Firestore collection plus the bootstrapped project owner email.
 */
export async function isAdminUser(uid) {
  if (!db || !uid) return false
  const currentUser = auth?.currentUser
  if (
    currentUser?.uid === uid &&
    currentUser?.email === BOOTSTRAP_ADMIN_EMAIL &&
    currentUser?.emailVerified
  ) {
    return true
  }
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

export async function submitRoleRequest({ uid, org, name, title, proof }) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  try {
    await setDoc(doc(db, ROLE_REQUESTS, uid), {
      uid,
      org: org.trim().slice(0, 100),
      name: name.trim().slice(0, 100),
      title: title.trim().slice(0, 100),
      proof: proof.trim().slice(0, 500),
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, `${ROLE_REQUESTS}/${uid}`)
    }
    throw error
  }
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
export async function approveRequest({ request, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')

  try {
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
    await batch.commit()
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.WRITE, `${ROLES}/${request.uid}`)
    }
    throw error
  }
}

export async function rejectRequest({ request, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')
  try {
    await updateDoc(doc(db, ROLE_REQUESTS, request.uid), {
      status: 'rejected',
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${ROLE_REQUESTS}/${request.uid}`,
      )
    }
    throw error
  }
}

// ---- announcements ---------------------------------------------------------

export async function createAnnouncement({
  uid,
  org,
  area,
  areaId,
  lat,
  lng,
  text,
  hours,
}) {
  if (!db) throw new Error('Firebase is not configured')
  if (!uid) throw new Error('Not signed in yet')

  const trimmed = text.trim()
  if (!trimmed) throw new Error('The notice is empty.')
  if (trimmed.length > MAX_ANNOUNCEMENT_LENGTH) {
    throw new Error(`Keep the notice under ${MAX_ANNOUNCEMENT_LENGTH} characters.`)
  }

  const span = Math.min(Math.max(Number(hours) || 1, 1), ANNOUNCEMENT_MAX_HOURS)

  try {
    await setDoc(doc(collection(db, ANNOUNCEMENTS)), {
      uid,
      org: org.trim().slice(0, 100),
      area: area.trim().slice(0, 100),
      areaId: areaId.trim().slice(0, 100),
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      text: trimmed,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + span * 60 * 60 * 1000),
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(error, OperationType.CREATE, ANNOUNCEMENTS)
    }
    throw error
  }
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

export async function deleteAnnouncement(id) {
  if (!db) throw new Error('Firebase is not configured')
  try {
    await deleteDoc(doc(db, ANNOUNCEMENTS, id))
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${ANNOUNCEMENTS}/${id}`,
      )
    }
    throw error
  }
}

// ---- imported source drafts ------------------------------------------------

export function subscribeToDrafts(onDrafts, onError) {
  if (!db) return () => {}
  // Single-field equality query with client-side sort so it works without a
  // composite index deployment.
  const pending = query(
    collection(db, SOURCE_DRAFTS),
    where('status', '==', 'pending'),
    limit(50),
  )
  return onSnapshot(
    pending,
    (snapshot) => {
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => toMillis(b.fetchedAt) - toMillis(a.fetchedAt))
      onDrafts(docs)
    },
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

  try {
    await updateDoc(doc(db, SOURCE_DRAFTS, draft.id), {
      status: 'published',
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${SOURCE_DRAFTS}/${draft.id}`,
      )
    }
    throw error
  }
}

export async function discardDraft({ draft, adminUid }) {
  if (!db) throw new Error('Firebase is not configured')
  try {
    await updateDoc(doc(db, SOURCE_DRAFTS, draft.id), {
      status: 'discarded',
      reviewedBy: adminUid,
      reviewedAt: serverTimestamp(),
    })
  } catch (error) {
    if (isPermissionError(error)) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${SOURCE_DRAFTS}/${draft.id}`,
      )
    }
    throw error
  }
}
