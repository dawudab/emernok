/**
 * Polls official utility sources and files anything that looks like an outage
 * notice into `sourceDrafts` for a moderator to review.
 *
 * It never publishes. A parser that mistakes a press release for an outage, or
 * attaches it to the wrong neighbourhood, would otherwise put a false official
 * alert on the map — the one thing a verified source must not do.
 *
 * Run locally:   FIREBASE_SERVICE_ACCOUNT="$(cat key.json)" npm run poll:sources
 * Run in CI:     see .github/workflows/poll-sources.yml
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { NEIGHBOURHOODS } from '../src/constants.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const MAX_TEXT = 500
const REQUEST_TIMEOUT_MS = 15000

// A notice only matters to us if it is about a utility failing. Without this
// every press release and job posting would land in the queue.
const OUTAGE_TERMS = [
  'coupure',
  'panne',
  'délestage',
  'interruption',
  'maintenance',
  'rétabli',
  'électricité',
  'electricite',
  "eau",
  'انقطاع',
  'الكهرباء',
  'الماء',
  'صيانة',
  'عطل',
  'إصلاح',
]

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractRssItems(xml) {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? []
  return blocks.map((block) => {
    const pick = (tag) => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      return match ? stripTags(match[1].replace(/<!\[CDATA\[|\]\]>/g, '')) : ''
    }
    const link =
      pick('link') ||
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      ''
    return {
      text: [pick('title'), pick('description') || pick('summary')]
        .filter(Boolean)
        .join(' — '),
      link,
    }
  })
}

function extractHtmlItems(html) {
  // Headings and paragraphs are where a notice lives; the whole page as one
  // blob would be unreviewable.
  const blocks = html.match(/<(h1|h2|h3|p)[^>]*>[\s\S]*?<\/\1>/gi) ?? []
  return blocks
    .map((block) => ({ text: stripTags(block), link: '' }))
    .filter((item) => item.text.length > 30)
}

export function mentionsOutage(text) {
  const lower = text.toLowerCase()
  return OUTAGE_TERMS.some((term) => lower.includes(term.toLowerCase()))
}

export function matchNeighbourhood(text) {
  const lower = text.toLowerCase()
  for (const area of NEIGHBOURHOODS) {
    const names = [area.name, ...(area.aliases ?? [])]
    if (names.some((name) => lower.includes(name.toLowerCase()))) return area
  }
  return null
}

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EmernokBot/1.0 (+https://github.com/dawudab/emernok)' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function draftId(sourceId, item) {
  // Keyed by content so re-running cannot duplicate a draft, and a draft a
  // moderator already discarded never comes back.
  return createHash('sha1')
    .update(`${sourceId}:${item.link || item.text}`)
    .digest('hex')
    .slice(0, 24)
}

async function main() {
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!credentials) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  }

  const config = JSON.parse(
    await readFile(resolve(HERE, 'sources.json'), 'utf8'),
  )
  const sources = config.sources ?? []
  if (sources.length === 0) {
    console.log('No sources configured — add them to scripts/sources.json.')
    return
  }

  initializeApp({ credential: cert(JSON.parse(credentials)) })
  const db = getFirestore()

  let created = 0
  for (const source of sources) {
    let body
    try {
      body = await fetchText(source.url)
    } catch (error) {
      // One broken source must not stop the others, but it has to be loud:
      // silent failure is how a dead importer goes unnoticed for weeks.
      console.error(`FAILED ${source.id}: ${error.message}`)
      continue
    }

    const items =
      source.type === 'rss' ? extractRssItems(body) : extractHtmlItems(body)
    console.log(`${source.id}: ${items.length} items`)

    for (const item of items) {
      if (!item.text || !mentionsOutage(item.text)) continue
      const area = matchNeighbourhood(item.text)
      if (!area) continue

      const id = draftId(source.id, item)
      const ref = db.collection('sourceDrafts').doc(id)
      if ((await ref.get()).exists) continue

      await ref.set({
        source: source.id,
        org: source.org,
        url: item.link || source.url,
        text: item.text.slice(0, MAX_TEXT),
        areaId: area.id,
        status: 'pending',
        fetchedAt: FieldValue.serverTimestamp(),
      })
      created += 1
      console.log(`  queued ${area.name}: ${item.text.slice(0, 80)}…`)
    }
  }

  console.log(`Done. ${created} new draft(s) awaiting review.`)
}

// Guarded so the parsing helpers above can be imported and tested without the
// importer running and writing to Firestore.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
