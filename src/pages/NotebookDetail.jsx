import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, Pencil, Download, CheckSquare, Square, X, Search } from 'lucide-react'
import { useCards } from '../hooks/useCards'
import { useNotebooks } from '../hooks/useNotebooks'
import { motion, AnimatePresence } from 'framer-motion'
import SpeakButton from '../components/SpeakButton'
import ConfirmModal from '../components/ConfirmModal'
import ExportModal from '../components/ExportModal'
import AddCardModal from '../components/AddCardModal'

const STATUS_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'new',      label: 'New' },
  { value: 'normal',   label: 'Normal' },
  { value: 'familiar', label: 'Familiar' },
]

const SORT_OPTIONS = [
  { value: 'date',   label: 'Date Added' },
  { value: 'alpha',  label: 'Alphabetical' },
  { value: 'status', label: 'Days to Review' },
]

export default function NotebookDetail() {
  const { id } = useParams()
  const { cards, loading, createCard, createCardsBatch, updateCard, deleteCard, moveCards } = useCards(id)
  const { notebooks } = useNotebooks()
  const notebookName = notebooks.find(n => n.id === id)?.name || ''
  const navigate = useNavigate()

  // ── Filter / sort state — shared across all notebooks ───────────────────
  const [filterStatus, setFilterStatus] = useState(
    () => localStorage.getItem('vocab_nb_filter') || 'all'
  )
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('vocab_nb_sort') || 'date'
  )
  const [sortOrder, setSortOrder] = useState(
    () => localStorage.getItem('vocab_nb_order') || 'asc'
  )
  const [filteredCards, setFilteredCards] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { localStorage.setItem('vocab_nb_filter', filterStatus) }, [filterStatus])
  useEffect(() => { localStorage.setItem('vocab_nb_sort',   sortBy)       }, [sortBy])
  useEffect(() => { localStorage.setItem('vocab_nb_order',  sortOrder)    }, [sortOrder])

  useEffect(() => {
    let result = [...cards]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        (c.english?.toLowerCase() || '').includes(q) ||
        (c.chinese?.toLowerCase() || '').includes(q) ||
        (c.part_of_speech?.toLowerCase() || '').includes(q)
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus)
    }

    if (sortBy === 'alpha') {
      result.sort((a, b) => {
        const r = (a.english || '').localeCompare(b.english || '')
        return sortOrder === 'asc' ? r : -r
      })
    } else if (sortBy === 'status') {
      const order = { new: 0, normal: 1, familiar: 2 }
      result.sort((a, b) => {
        const r = (order[a.status] ?? 0) - (order[b.status] ?? 0)
        return sortOrder === 'asc' ? r : -r
      })
    } else if (sortBy === 'date') {
      result.sort((a, b) => {
        const r = new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        return sortOrder === 'asc' ? r : -r
      })
    }

    setFilteredCards(result)
  }, [cards, filterStatus, sortBy, sortOrder, searchQuery])

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [editEnglish, setEditEnglish] = useState('')
  const [editPartOfSpeech, setEditPartOfSpeech] = useState('')
  const [editChinese, setEditChinese] = useState('')
  const [batchText, setBatchText] = useState('')
  const [delimiter, setDelimiter] = useState(',')
  const [preview, setPreview] = useState([])
  const [confirmModal, setConfirmModal] = useState({ open: false, cardId: null })
  const [showExportModal, setShowExportModal] = useState(false)

  // ── Bulk selection state ─────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [moveLoading, setMoveLoading] = useState(false)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleAddCard = async ({ english, part_of_speech, chinese }) => {
    await createCard({ english, part_of_speech, chinese })
  }

  const handleBatchPreview = () => {
    if (!batchText.trim()) { setPreview([]); return }
    const lines = batchText.trim().split('\n')
    const parsed = lines.map((line, index) => {
      const parts = line.split(delimiter).map(p => p.trim())
      if (parts.length >= 3) {
        return { id: index, english: parts[0], part_of_speech: parts[1], chinese: parts[2], valid: true }
      }
      return { id: index, raw: line, valid: false }
    })
    setPreview(parsed)
  }

  const handleBatchSubmit = async () => {
    const validCards = preview.filter(p => p.valid).map(p => ({
      english: p.english, part_of_speech: p.part_of_speech, chinese: p.chinese
    }))
    if (validCards.length > 0) {
      await createCardsBatch(validCards)
      setBatchText(''); setPreview([]); setShowBatchModal(false)
    }
  }

  const handleDelete = (cardId) => { setConfirmModal({ open: true, cardId }) }

  const handleEditOpen = (card) => {
    setEditingCard(card)
    setEditEnglish(card.english)
    setEditPartOfSpeech(card.part_of_speech)
    setEditChinese(card.chinese)
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (editEnglish.trim() && editChinese.trim()) {
      await updateCard(editingCard.id, {
        english: editEnglish.trim(),
        part_of_speech: editPartOfSpeech,
        chinese: editChinese.trim()
      })
      setShowEditModal(false); setEditingCard(null)
    }
  }

  const toggleSelectCard = (cardId) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedCardIds(
      selectedCardIds.length === filteredCards.length ? [] : filteredCards.map(c => c.id)
    )
  }

  const exitSelectionMode = () => { setSelectionMode(false); setSelectedCardIds([]) }

  const handleBulkDelete = async () => {
    for (const cardId of selectedCardIds) await deleteCard(cardId)
    exitSelectionMode(); setConfirmBulkDelete(false)
  }

  const handleMoveCards = async (targetNotebookId) => {
    if (!targetNotebookId) return
    setMoveLoading(true)
    await moveCards(selectedCardIds, targetNotebookId)
    setMoveLoading(false); exitSelectionMode(); setShowMoveModal(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading cards...</div>
  }

  const moveTargetNotebooks = notebooks.filter(n => n.id !== id)
  const countByStatus = (status) => cards.filter(c => c.status === status).length

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex mt-8 justify-between items-start flex-wrap gap-3 mb-9">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-1">
              Manage Cards
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {filteredCards.length !== cards.length
                ? `Showing ${filteredCards.length} of ${cards.length} cards`
                : `${cards.length} cards in this notebook`}
            </p>
          </div>

          {/* ── Action buttons ─────────────────────────────────────────── */}
          {!selectionMode ? (
            // 手機：Add Card 獨立第一行，其餘三個第二行；桌面：單行排列
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
              {/* 第一行（手機）/ 最後一個（桌面） */}
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center justify-center gap-1.5 w-fit sm:order-last"
              >
                <Plus className="w-4 h-4" />
                <span>Add Card</span>
              </button>

              {/* 第二行（手機）/ 前三個（桌面） */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => setSelectionMode(true)}
                  className="btn-secondary flex items-center gap-1.5 "
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Select</span>
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Batch Add</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
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
              </div>
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
          )}
        </div>
      </div>

      {/* ── Filter / Sort bar ─────────────────────────────────────────────── */}
      {!selectionMode && (
        <div className="card p-4 mb-5">
          {/* 行1（手機）/ 全部同行（桌面 sm+）：搜尋欄 */}
          <div className="flex flex-col gap-2">
            {/* 搜尋欄永遠第一行 */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search English, Chinese, part of speech…"
                className="input pl-9 py-1.5 text-sm w-full"
              />
            </div>

            {/* 行2（手機）/ 右側（桌面 inline-with-search via sm:flex-row on outer） */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  Status
                </span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="input py-1.5 text-sm w-auto"
                >
                  {STATUS_FILTERS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label} ({value === 'all' ? cards.length : countByStatus(value)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  Sort
                </span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
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
            </div>

            {/* 行3：showing count */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredCards.length} of {cards.length} cards
            </div>
          </div>
        </div>
      )}

      {/* ── Card grid ─────────────────────────────────────────────────────── */}
      {filteredCards.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white mb-2">
            {filterStatus !== 'all' ? `No ${filterStatus} cards` : 'No cards yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filterStatus !== 'all'
              ? 'Try a different filter or add new cards'
              : 'Add your first vocabulary card to start learning'}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Card</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCards.map((card) => {
              const isSelected = selectedCardIds.includes(card.id)
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
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
                      </div>
                      {!selectionMode && (
                        <>
                          <button
                            onClick={() => handleEditOpen(card)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{card.chinese}</p>
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded ${
                        card.status === 'new'      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        card.status === 'normal'   ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                                                     'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {card.status}
                      </span>
                      {card.current_interval > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Review in <span className="font-bold">{card.current_interval}</span> day{card.current_interval !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add Single Card Modal ─────────────────────────────────────────── */}
      <AddCardModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddCard}
        notebooks={[]}
        defaultNotebookId={id}
      />

      {/* ── Batch Add Modal ───────────────────────────────────────────────── */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">Batch Add Cards</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter one card per line in the format: english{delimiter}part_of_speech{delimiter}chinese
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delimiter</label>
              <select value={delimiter} onChange={e => setDelimiter(e.target.value)} className="input max-w-xs">
                <option value=",">Comma (,)</option>
                <option value="/">Slash (/)</option>
                <option value="|">Pipe (|)</option>
                <option value="\t">Tab</option>
              </select>
            </div>
            <textarea
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              className="input h-40 font-mono text-sm mb-3"
              placeholder={`happy${delimiter}adjective${delimiter}快樂的\nlearn${delimiter}verb${delimiter}學習`}
            />
            <button onClick={handleBatchPreview} className="btn-secondary w-full mb-4">Preview</button>
            {preview.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Preview ({preview.filter(p => p.valid).length} valid cards)
                </h3>
                <div className="space-y-2">
                  {preview.map(item => (
                    <div key={item.id} className={`text-sm p-2 rounded ${
                      item.valid
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                    }`}>
                      {item.valid ? (
                        <div className="flex justify-between">
                          <span className="font-medium">{item.english}</span>
                          <span className="text-gray-600 dark:text-gray-400">{item.part_of_speech}</span>
                          <span>{item.chinese}</span>
                        </div>
                      ) : (
                        <span className="text-red-700 dark:text-red-300">Invalid: {item.raw}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowBatchModal(false); setBatchText(''); setPreview([]) }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={preview.filter(p => p.valid).length === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {preview.filter(p => p.valid).length} Cards
              </button>
            </div>
          </motion.div>
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
              Move {selectedCardIds.length} card(s) to another notebook. Review progress will be preserved.
            </p>
            {moveTargetNotebooks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No other notebooks available. Please create another notebook first.
              </p>
            ) : (
              <select
                className="input mb-4"
                defaultValue=""
                onChange={e => { if (e.target.value) handleMoveCards(e.target.value) }}
                disabled={moveLoading}
              >
                <option value="" disabled>Select target notebook…</option>
                {moveTargetNotebooks.map(n => (
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

      {/* ── Confirm modals ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Card"
        message="Are you sure you want to delete this card? This cannot be undone."
        confirmLabel="Delete"
        confirmClass="bg-red-500 hover:bg-red-700 text-white rounded-md px-4 py-2 transition-colors"
        onConfirm={async () => {
          await deleteCard(confirmModal.cardId)
          setConfirmModal({ open: false, cardId: null })
        }}
        onCancel={() => setConfirmModal({ open: false, cardId: null })}
      />

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
        cards={cards.map(c => ({ ...c, notebook: { name: notebookName } }))}
        title={notebookName || 'Notebook Cards'}
      />
    </div>
  )
}