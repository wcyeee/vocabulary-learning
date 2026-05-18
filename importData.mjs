import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, doc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'fs'

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ---- PASTE YOUR DATA HERE ----
// notebooks CSV format: id,name,is_pinned,last_tested_at,created_at
// cards CSV format: id,notebook_id,english,part_of_speech,chinese,status,next_review_at,current_interval,consecutive_familiar_count,created_at

const notebooksCSV = readFileSync('./notebooks.csv', 'utf8')
const cardsCSV = readFileSync('./cards.csv', 'utf8')

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const obj = {}
    headers.forEach((h, i) => obj[h] = values[i] || '')
    return obj
  })
}

async function importData() {
  const notebooks = parseCSV(notebooksCSV)
  const cards = parseCSV(cardsCSV)

  // Map old UUID -> new Firebase doc ID
  const notebookIdMap = {}

  console.log(`Importing ${notebooks.length} notebooks...`)
  for (const nb of notebooks) {
    const docRef = await addDoc(collection(db, 'notebooks'), {
      name: nb.name,
      is_pinned: nb.is_pinned === 'true',
      last_tested_at: nb.last_tested_at || null,
      createdAt: nb.created_at || new Date().toISOString(),
    })
    notebookIdMap[nb.id] = docRef.id
    console.log(`  ✓ Notebook: ${nb.name} → ${docRef.id}`)
  }

  console.log(`\nImporting ${cards.length} cards...`)
  const batch = writeBatch(db)
  let count = 0

  for (const card of cards) {
    const newNotebookId = notebookIdMap[card.notebook_id]
    if (!newNotebookId) {
      console.warn(`  ⚠ Skipping card ${card.english}: notebook not found`)
      continue
    }
    const cardRef = doc(collection(db, 'notebooks', newNotebookId, 'cards'))
    batch.set(cardRef, {
      english: card.english,
      part_of_speech: card.part_of_speech,
      chinese: card.chinese,
      status: card.status || 'new',
      next_review_at: card.next_review_at || null,
      current_interval: parseInt(card.current_interval) || 0,
      consecutive_familiar_count: parseInt(card.consecutive_familiar_count) || 0,
      notebook_id: newNotebookId,
      createdAt: card.created_at || new Date().toISOString(),
    })
    count++
    // Firestore batch limit is 500
    if (count % 499 === 0) {
      await batch.commit()
      console.log(`  ✓ Committed batch of 499`)
    }
  }
  await batch.commit()
  console.log(`  ✓ Done! Imported ${count} cards`)
}

importData().catch(console.error)