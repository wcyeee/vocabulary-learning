import { useState, useEffect } from 'react'
import { Search, Pencil, Trash2, Download, CheckSquare, Square, X } from 'lucide-react'
import {
  collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc,
  writeBatch
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import SpeakButton from '../components/SpeakButton'
import ConfirmModal from '../components/ConfirmModal'
import ExportModal from '../components/ExportModal'

const SORT_OPTIONS = [
  { value: 'alpha',   label: 'Alphabetical' },
  { value: 'date',    label: 'Date Added' },
  { value: 'review',  label: 'Days to Review' },
  { value: 'status',  label: 'Status' },
]

export default function AllCards() {
  const [cards, setCards] = useState([])
  const [filteredCards, setFilteredCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Initialise sort state from localStorage ──────────────────────────────
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('vocab_allcards_sort') || 'alpha'
  )
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem('vocab_allcards_order') || 'asc'
  )

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [editEnglish, setEditEnglish] = useState('')
  const [editPartOfSpeech, setEditPartOfSpeech] = useState('')
  const [editChinese, setEditChinese] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, card: null })
  const [showExportModal, setShowExportModal] = useState(false)

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [allNotebooks, setAllNotebooks] = useState([])
  const [moveLoading, setMoveLoading] = useState(false)

  // ── Persist sort preferences ─────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('vocab_allcards_sort',  sortBy)    }, [sortBy])
  useEffect(() => { localStorage.setItem('vocab_allcards_order', sortOrder) }, [sortOrder])

  useEffect(() => { fetchAllCards() }, [])
  useEffect(() => { filterAndSortCards() }, [cards, searchQuery, sortBy, sortOrder])

  const fetchAllCards = async () => {
    try {
      setLoading(true)
      const notebooksSnap = await getDocs(collection(db, 'notebooks'))
      const notebooks = {}
      notebooksSnap.docs.forEach(d => { notebooks[d.id] = d.data().name })
      setAllNotebooks(notebooksSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      let allCards = []
      for (const [notebookId, notebookName] of Object.entries(notebooks)) {
        const cardsSnap = await getDocs(
          query(collection(db, 'notebooks', notebookId, 'cards'), orderBy('createdAt', 'desc'))
        )
        const c = cardsSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          notebookId,
          notebook: { name: notebookName }
        }))
        allCards = [...allCards, ...c]
      }
      setCards(allCards)
    } catch (err) {
      console.error('Error fetching cards:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilReview = (card) => {
    if (card.status === 'new' || !card.next_review_at) return 0
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reviewDate = new Date(card.next_review_at)
    if (isNaN(reviewDate.getTime())) return 0
    const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate())
    const diff = Math.ceil((reviewDay - today) / (1000 * 60 * 60 * 24))
    return isNaN(diff) || diff < 0 ? 0 : diff
  }

  const handleEditOpen = (card) => {
    setEditingCard(card)
    setEditEnglish(card.english)
    setEditPartOfSpeech(card.part_of_speech)
    setEditChinese(card.chinese)
    setShowEditModal(true)
  }

  const handleDelete = (card) => { setConfirmModal({ open: true, card }) }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (editEnglish.trim() && editChinese.trim()) {
      const updates = {
        english: editEnglish.trim(),
        part_of_speech: editPartOfSpeech,
        chinese: editChinese.trim()
      }
      await updateDoc(doc(db, 'notebooks', editingCard.notebookId, 'cards', editingCard.id), updates)
      setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...updates } : c))
      setShowEditModal(false)
      setEditingCard(null)
    }
  }

  const filterAndSortCards = () => {
    let filtered = [...cards]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(card =>
        (card.english?.toLowerCase() || '').includes(q) ||
        (card.chinese?.toLowerCase() || '').includes(q) ||
        (card.part_of_speech?.toLowerCase() || '').includes(q)
      )
    }
    if (sortBy === 'alpha') {
      filtered.sort((a, b) => {
        const r = (a.english || '').localeCompare(b.english || '')
        return sortOrder === 'asc' ? r : -r
      })
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const r = new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        return sortOrder === 'asc' ? r : -r
      })
    } else if (sortBy === 'review') {
      filtered.sort((a, b) => {
        const r = getDaysUntilReview(a) - getDaysUntilReview(b)
        return sortOrder === 'asc' ? r : -r
      })
    } else if (sortBy === 'status') {
      filtered.sort((a, b) => {
        const order = { new: 0, normal: 1, familiar: 2 }
        const r = (order[a.status] ?? 0) - (order[b.status] ?? 0)
        return sortOrder === 'asc' ? r : -r
      })
    }
    setFilteredCards(filtered)
  }

  // ── Sort chip handler ────────────────────────────────────────────────────
  const handleSortChip = (value) => {
    if (sortBy === value) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(value)
      setSortOrder('asc')
    }
  }

  // ── Bulk selection helpers ───────────────────────────────────────────────
  const toggleSelectCard = (cardId) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedCardIds(
      selectedCardIds.length === filteredCards.length
        ? []
        : filteredCards.map(c => c.id)
    )
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedCardIds([])
  }

  const handleBulkDelete = async () => {
    const batch = writeBatch(db)
    for (const cardId of selectedCardIds) {
      const card = cards.find(c => c.id === cardId)
      if (!card) continue
      batch.delete(doc(db, 'notebooks', card.notebookId, 'cards', cardId))
    }
    await batch.commit()
    setCards(prev => prev.filter(c => !selectedCardIds.includes(c.id)))
    exitSelectionMode()
    setConfirmBulkDelete(false)
  }

  const handleMoveCards = async (targetNotebookId) => {
    if (!targetNotebookId) return
    setMoveLoading(true)
    try {
      const batch = writeBatch(db)
      for (const cardId of selectedCardIds) {
        const card = cards.find(c => c.id === cardId)
        if (!card) continue
        const { id: _id, notebookId: _nid, notebook: _nb, ...cardData } = card
        const newRef = doc(collection(db, 'notebooks', targetNotebookId, 'cards'))
        batch.set(newRef, { ...cardData, notebook_id: targetNotebookId })
        batch.delete(doc(db, 'notebooks', card.notebookId, 'cards', cardId))
      }
      await batch.commit()
      setCards(prev => prev.filter(c => !selectedCardIds.includes(c.id)))
    } catch (err) {
      console.error('Move failed:', err)
    } finally {
      setMoveLoading(false)
      exitSelectionMode()
      setShowMoveModal(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading all cards...</div>
  }

  return (
    <div>
      <div className="mt-6 mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
          All Vocabulary
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and search across all your cards
        </p>
      </div>

      {/* ── Filter / Sort card ────────────────────────────────────────────── */}
      <div className="card p-5 mb-6">
        {!selectionMode ? (
          /* ── 正常模式：單行 搜尋 + Sort + 按鈕 ── */
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* 搜尋欄 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by English, Chinese, or part of speech…"
                className="input pl-9 py-1.5 text-sm"
              />
            </div>

            {/* 第二行（手機）/ 右側群組（桌面）*/}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setSortOrder('asc') }}
                className="input py-1.5 text-sm w-auto"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="btn-secondary px-2.5 py-1.5 text-sm flex-shrink-0"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button> 
            </div>
                
            {/* 手機第三行 */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              <button
                onClick={() => setSelectionMode(true)}
                className="btn-secondary flex items-center gap-1.5 whitespace-nowrap py-1.5 text-sm"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Select</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="btn-secondary flex items-center gap-1.5 whitespace-nowrap py-1.5 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>

          </div>
        ) : (
          /* ── 選取模式：兩行（手機）/ 單行（桌面） ── */
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* 搜尋欄 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by English, Chinese, or part of speech…"
                className="input pl-9 py-1.5 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              {/* 獨立叉叉 + count */}
              <button
                onClick={exitSelectionMode}
                className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors p-0.5"
                title="Exit selection"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {selectedCardIds.length} selected
              </span>

              <button onClick={toggleSelectAll} className="btn-secondary text-sm py-1.5 whitespace-nowrap">
                {selectedCardIds.length === filteredCards.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={selectedCardIds.length === 0}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Delete ({selectedCardIds.length})
              </button>
              <button
                onClick={() => setShowMoveModal(true)}
                disabled={selectedCardIds.length === 0}
                className="btn-primary text-sm py-1.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Move ({selectedCardIds.length})
              </button>
            </div>
          </div>
        )}

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Showing {filteredCards.length} of {cards.length} cards
      </div>
    </div>

      {/* ── Card grid ─────────────────────────────────────────────────────── */}
      {filteredCards.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'No cards match your search' : 'No cards found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card, index) => {
            const daysLeft = getDaysUntilReview(card)
            const isSelected = selectedCardIds.includes(card.id)
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`card p-5 group relative transition-all
                  ${selectionMode ? 'cursor-pointer select-none' : ''}
                  ${selectionMode && isSelected ? 'ring-2 ring-gray-800 dark:ring-gray-300 bg-gray-50 dark:bg-gray-700' : ''}
                `}
                onClick={selectionMode ? () => toggleSelectCard(card.id) : undefined}
              >
                {selectionMode && (
                  <div className="absolute top-3 left-3 z-10">
                    {isSelected
                      ? <CheckSquare className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                      : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    }
                  </div>
                )}

                <div className={selectionMode ? 'pl-7' : ''}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {card.english}
                        </h3>
                        {!selectionMode && <SpeakButton text={card.english} size="sm" />}
                      </div>
                      <span className="inline-block text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        {card.part_of_speech}
                      </span>
                      {!selectionMode && (
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEditOpen(card)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(card)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">{card.chinese}</p>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {card.notebook?.name || 'Unknown notebook'}
                    </span>
                    <div className="flex items-center">
                      {card.status !== 'new' && card.next_review_at && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-3">
                          Review in <strong className="font-bold">{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        card.status === 'new'      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        card.status === 'normal'   ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                                                     'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {card.status}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">Edit Card</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">English</label>
                <input type="text" value={editEnglish} onChange={e => setEditEnglish(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Part of Speech</label>
                <input type="text" value={editPartOfSpeech} onChange={e => setEditPartOfSpeech(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chinese</label>
                <input type="text" value={editChinese} onChange={e => setEditChinese(e.target.value)} className="input" required />
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Move Modal ────────────────────────────────────────────────────── */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">Move Cards</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Move {selectedCardIds.length} card(s) to a notebook. Review progress will be preserved.
            </p>
            {allNotebooks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No notebooks available.</p>
            ) : (
              <select
                className="input mb-4"
                defaultValue=""
                onChange={e => { if (e.target.value) handleMoveCards(e.target.value) }}
                disabled={moveLoading}
              >
                <option value="" disabled>Select target notebook…</option>
                {allNotebooks.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            )}
            <button onClick={() => setShowMoveModal(false)} className="btn-secondary w-full" disabled={moveLoading}>
              {moveLoading ? 'Moving…' : 'Cancel'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Single card delete */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Card"
        message="Are you sure you want to delete this card?"
        confirmLabel="Delete"
        confirmClass="bg-red-500 hover:bg-red-700 text-white rounded-md px-4 py-2 transition-colors"
        onConfirm={async () => {
          const card = confirmModal.card
          await deleteDoc(doc(db, 'notebooks', card.notebookId, 'cards', card.id))
          setCards(prev => prev.filter(c => c.id !== card.id))
          setConfirmModal({ open: false, card: null })
        }}
        onCancel={() => setConfirmModal({ open: false, card: null })}
      />

      {/* Bulk delete */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        title={`Delete ${selectedCardIds.length} Cards`}
        message="Are you sure you want to delete all selected cards? This cannot be undone."
        confirmLabel="Delete All"
        confirmClass="bg-red-500 hover:bg-red-700 text-white rounded-md px-4 py-2 transition-colors"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        cards={filteredCards}
        title="All Vocabulary"
      />
    </div>
  )
}