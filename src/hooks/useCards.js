import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useCards(notebookId) {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!notebookId) return
    const q = query(
      collection(db, 'notebooks', notebookId, 'cards'),
      orderBy('createdAt', 'desc')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCards(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })
    return unsubscribe
  }, [notebookId])

  const createCard = async (cardData) => {
    try {
      const docRef = await addDoc(collection(db, 'notebooks', notebookId, 'cards'), {
        ...cardData,
        notebook_id: notebookId,
        status: 'new',
        consecutive_familiar_count: 0,
        current_interval: 0,
        next_review_at: null,
        createdAt: new Date().toISOString(),
      })
      return { data: { id: docRef.id }, error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }

  const createCardsBatch = async (cardsData) => {
    try {
      const batch = writeBatch(db)
      cardsData.forEach(card => {
        const ref = doc(collection(db, 'notebooks', notebookId, 'cards'))
        batch.set(ref, {
          ...card,
          notebook_id: notebookId,
          status: 'new',
          consecutive_familiar_count: 0,
          current_interval: 0,
          next_review_at: null,
          createdAt: new Date().toISOString(),
        })
      })
      await batch.commit()
      return { error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }

  const updateCard = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'notebooks', notebookId, 'cards', id), updates)
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  const deleteCard = async (id) => {
    try {
      await deleteDoc(doc(db, 'notebooks', notebookId, 'cards', id))
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  return { cards, loading, error, createCard, createCardsBatch, updateCard, deleteCard }
}