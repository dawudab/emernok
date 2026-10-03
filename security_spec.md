# Security Specification — Emernok Firestore Rules

## 1. Data Invariants
1. **Verified Identity Gate**: Only authenticated users with a verified email (`email_verified == true`) or verified phone number (`phone_number != ''`) may create reports, vote, post messages, or apply for official roles.
2. **Atomic Rate-Limiting**: Every `reports/{reportId}` creation must atomically update `userStats/{uid}` in the same transaction (`getAfter` invariant), enforcing a 60s cooldown and 20/day cap. Every `messages/{messageId}` creation must atomically update `chatStats/{uid}`, enforcing a 10s cooldown and 100/day cap.
3. **Atomic Single Vote**: A `reports/{reportId}` vote counter (`stillOutCount` or `restoredCount`) may only increment by 1 if `reports/{reportId}/votes/{uid}` did not exist before and is created in the same batch (`getAfter` invariant).
4. **Role & Admin Isolation**: Only admins (`exists(/admins/$(uid))` or verified bootstrap admin `davionbase@gmail.com`) can approve/reject `roleRequests`, write to `roles`, or moderate `sourceDrafts`.
5. **Organization Attribution**: An official utility worker may only create `announcements` where `org == get(/roles/$(uid)).data.org`.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Write**: `{ uid: "u1", type: "power", lat: 18.07, lng: -15.95, geohash: "s4", createdAt: SERVER_TIME, stillOutCount: 0, restoredCount: 0 }` with `email_verified: false` -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Report**: `uid: "other_user"` when `request.auth.uid == "u1"` -> `PERMISSION_DENIED`.
3. **Bypassing Rate-Limit Counter**: Creating `reports/{id}` without updating `userStats/{uid}` in the same transaction -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Report**: Adding `"verified": true` to `reports/{id}` -> `PERMISSION_DENIED`.
5. **Double Voting / Counter Manipulation**: Incrementing `restoredCount` by 5 or voting when `votes/{uid}` already exists -> `PERMISSION_DENIED`.
6. **Self-Approving Role Request**: Creating `roleRequests/{uid}` with `status: "approved"` -> `PERMISSION_DENIED`.
7. **Unauthorized Role Creation**: Non-admin writing to `roles/{uid}` -> `PERMISSION_DENIED`.
8. **Cross-Org Announcement Spoofing**: Official approved for `SNDE` creating an announcement with `org: "SOMELEC"` -> `PERMISSION_DENIED`.
9. **Oversized Message Payload**: Creating `messages/{id}` with `text` length 500 (> 300 max) -> `PERMISSION_DENIED`.
10. **PII / Private Counter Read**: User `u1` reading `userStats/u2` or `roleRequests/u2` -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: Creating `reports/{id}` with a past `createdAt` timestamp != `request.time` -> `PERMISSION_DENIED`.
12. **Terminal State Mutation**: Attempting to update an already reviewed `roleRequests/{uid}` where `resource.data.status != 'pending'` -> `PERMISSION_DENIED`.
