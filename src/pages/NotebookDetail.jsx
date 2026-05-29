import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, Pencil } from 'lucide-react'
import { useCards } from '../hooks/useCards'
import { motion, AnimatePresence } from 'framer-motion'
import SpeakButton from '../components/SpeakButton'
import ConfirmModal from '../components/ConfirmModal'

export default function NotebookDetail() {
  const { id } = useParams()
  const { cards, loading, createCard, createCardsBatch, updateCard, deleteCard } = useCards(id)
  const navigate = useNavigate()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [editEnglish, setEditEnglish] = useState('')
  const [editPartOfSpeech, setEditPartOfSpeech] = useState('')
  const [editChinese, setEditChinese] = useState('')
  const [english, setEnglish] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [chinese, setChinese] = useState('')
  
  const [batchText, setBatchText] = useState('')
  const [delimiter, setDelimiter] = useState(',')
  const [preview, setPreview] = useState([])

  const [confirmModal, setConfirmModal] = useState({ open: false, cardId: null })

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (english.trim() && chinese.trim()) {
      await createCard({
        english: english.trim(),
        part_of_speech: partOfSpeech,
        chinese: chinese.trim()
      })
      setEnglish('')
      setChinese('')
      setPartOfSpeech('')
      setShowAddModal(false)
    }
  }

  const handleBatchPreview = () => {
    if (!batchText.trim()) {
      setPreview([])
      return
    }

    const lines = batchText.trim().split('\n')
    const parsed = lines.map((line, index) => {
      const parts = line.split(delimiter).map(p => p.trim())
      if (parts.length >= 3) {
        return {
          id: index,
          english: parts[0],
          part_of_speech: parts[1],
          chinese: parts[2],
          valid: true
        }
      }
      return {
        id: index,
        raw: line,
        valid: false
      }
    })
    setPreview(parsed)
  }

  const handleBatchSubmit = async () => {
    const validCards = preview.filter(p => p.valid).map(p => ({
      english: p.english,
      part_of_speech: p.part_of_speech,
      chinese: p.chinese
    }))
    
    if (validCards.length > 0) {
      await createCardsBatch(validCards)
      setBatchText('')
      setPreview([])
      setShowBatchModal(false)
    }
  }

  const handleDelete = (cardId) => {
    setConfirmModal({ open: true, cardId })
  }

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
      setShowEditModal(false)
      setEditingCard(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading cards...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Manage Cards
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{cards.length} cards in this notebook</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBatchModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Batch Add</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Card</span>
            </button>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="card p-12 text-center">
          <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white mb-2">
            No cards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your first vocabulary card to start learning
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Card</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {cards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card p-5 group relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {card.english}
                      </h3>
                      <SpeakButton text={card.english} size="sm" />
                    </div>
                    <span className="inline-block text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {card.part_of_speech}
                    </span>
                  </div>
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
                </div>
                <p className="text-gray-700 dark:text-gray-300">{card.chinese}</p>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded ${
                    card.status === 'new' ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 text-blue-700 dark:text-blue-300' :
                    card.status === 'normal' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                    'bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-300'
                  }`}>
                    {card.status}
                  </span>
                  {card.current_interval > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-3">
                      Review in <span className="font-bold">{card.current_interval}</span> day
                      {card.current_interval !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Single Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">
              Add New Card
            </h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  English
                </label>
                <input
                  type="text"
                  value={english}
                  onChange={(e) => setEnglish(e.target.value)}
                  className="input"
                  placeholder="e.g., happy"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Part of Speech
                </label>
                <input
                  type="text"
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  className="input"
                  placeholder="e.g., n, v, adj, phr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chinese
                </label>
                <input
                  type="text"
                  value={chinese}
                  onChange={(e) => setChinese(e.target.value)}
                  className="input"
                  placeholder="e.g., 快樂的"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEnglish('')
                    setChinese('')
                    setPartOfSpeech('noun')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Add Card
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Batch Add Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full my-8"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">
              Batch Add Cards
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter one card per line in the format: english{delimiter}part_of_speech{delimiter}chinese
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Delimiter
              </label>
              <select
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="input max-w-xs"
              >
                <option value=",">Comma (,)</option>
                <option value="/">Slash (/)</option>
                <option value="|">Pipe (|)</option>
                <option value="\t">Tab</option>
              </select>
            </div>

            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="input h-40 font-mono text-sm mb-3"
              placeholder={`happy${delimiter}adjective${delimiter}快樂的\nlearn${delimiter}verb${delimiter}學習`}
            />
            
            <button
              onClick={handleBatchPreview}
              className="btn-secondary w-full mb-4"
            >
              Preview
            </button>

            {preview.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Preview ({preview.filter(p => p.valid).length} valid cards)
                </h3>
                <div className="space-y-2">
                  {preview.map((item) => (
                    <div
                      key={item.id}
                      className={`text-sm p-2 rounded ${
                        item.valid
                          ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-700'
                      }`}
                    >
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
                onClick={() => {
                  setShowBatchModal(false)
                  setBatchText('')
                  setPreview([])
                }}
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">
              Edit Card
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">English</label>
                <input type="text" value={editEnglish} onChange={(e) => setEditEnglish(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Part of Speech</label>
                <input type="text" value={editPartOfSpeech} onChange={(e) => setEditPartOfSpeech(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chinese</label>
                <input type="text" value={editChinese} onChange={(e) => setEditChinese(e.target.value)} className="input" required />
              </div>
              <div className="flex space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
    </div>
  )
}
