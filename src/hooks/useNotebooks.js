import { useState, useEffect } from 'react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export function useNotebooks() {
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'notebooks'), orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // 使用 Promise.all 同步並行處理所有筆記本的子集合查詢，避免卡住
        const notebooksPromises = snapshot.docs.map(async (docSnap) => {
          const notebook = { id: docSnap.id, ...docSnap.data() }
          
          // Fetch cards subcollection for stats
          const cardsSnap = await getDocs(collection(db, 'notebooks', docSnap.id, 'cards'))
          const cards = cardsSnap.docs.map(d => d.data())
          
          notebook.total_cards = cards.length
          notebook.normal_cards = cards.filter(c => c.status === 'normal').length
          notebook.familiar_cards = cards.filter(c => c.status === 'familiar').length
          
          return notebook
        })

        const notebooksData = await Promise.all(notebooksPromises)

        // Pinned first
        notebooksData.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        
        setNotebooks(notebooksData)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])

  const createNotebook = async (name) => {
    try {
      const docRef = await addDoc(collection(db, 'notebooks'), {
        name,
        is_pinned: false,
        last_tested_at: null,
        createdAt: new Date().toISOString(), // 保持駝峰式大寫
      })
      return { data: { id: docRef.id }, error: null }
    } catch (err) {
      return { data: null, error: err.message }
    }
  }

  const updateNotebook = async (id, updates) => {
    try {
      await updateDoc(doc(db, 'notebooks', id), updates)
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  const deleteNotebook = async (id) => {
    try {
      // Delete all cards in subcollection first
      const cardsSnap = await getDocs(collection(db, 'notebooks', id, 'cards'))
      const deletePromises = cardsSnap.docs.map(d => deleteDoc(d.ref))
      await Promise.all(deletePromises)
      await deleteDoc(doc(db, 'notebooks', id))
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  }

  const togglePin = async (id, currentPinned) => {
    return updateNotebook(id, { is_pinned: !currentPinned })
  }

  return { notebooks, loading, error, createNotebook, updateNotebook, deleteNotebook, togglePin }
}