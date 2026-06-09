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
    
    const cardUnsubscribes = []

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 每次 notebooks 變動，清掉舊的 card listeners
      cardUnsubscribes.forEach(fn => fn())
      cardUnsubscribes.length = 0

      // 用 Map 存每個 notebook 的統計，方便即時更新
      const statsMap = {}
      snapshot.docs.forEach(docSnap => {
        statsMap[docSnap.id] = { id: docSnap.id, ...docSnap.data(), total_cards: 0, normal_cards: 0, familiar_cards: 0 }
      })

      const rebuildList = () => {
        const list = Object.values(statsMap)
        list.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        setNotebooks(list)
        setLoading(false)
      }

      // 對每個 notebook 的 cards 子集合建立即時監聽
      snapshot.docs.forEach(docSnap => {
        const cardUnsub = onSnapshot(
          collection(db, 'notebooks', docSnap.id, 'cards'),
          (cardsSnap) => {
            const cards = cardsSnap.docs.map(d => d.data())
            statsMap[docSnap.id] = {
              ...statsMap[docSnap.id],
              total_cards: cards.length,
              normal_cards: cards.filter(c => c.status === 'normal').length,
              familiar_cards: cards.filter(c => c.status === 'familiar').length,
            }
            rebuildList()
          }
        )
        cardUnsubscribes.push(cardUnsub)
      })

      // 如果完全沒有 notebooks，也要 setLoading(false)
      if (snapshot.docs.length === 0) {
        setNotebooks([])
        setLoading(false)
      }
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })

    return () => {
      unsubscribe()
      cardUnsubscribes.forEach(fn => fn())
    }
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