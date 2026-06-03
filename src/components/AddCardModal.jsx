import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ExternalLink } from 'lucide-react'

/**
 * AddCardModal — 共用的新增單字卡 modal
 *
 * Props:
 *   isOpen        {boolean}   是否顯示
 *   onClose       {function}  關閉 callback
 *   onSubmit      {function}  送出 callback，參數 { english, part_of_speech, chinese, notebookId }
 *   notebooks     {Array}     所有筆記本列表，格式 [{ id, name }]
 *   defaultNotebookId {string|null}  預設選中的 notebook（NotebookDetail 傳入時自動選且鎖定）
 */
export default function AddCardModal({ isOpen, onClose, onSubmit, notebooks = [], defaultNotebookId = null }) {
  const [english, setEnglish] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [chinese, setChinese] = useState('')
  const [selectedNotebookId, setSelectedNotebookId] = useState(defaultNotebookId || '')
  const [loading, setLoading] = useState(false)

  // 每次開啟時重置表單，並套用預設 notebook
  useEffect(() => {
    if (isOpen) {
      setEnglish('')
      setPartOfSpeech('')
      setChinese('')
      setSelectedNotebookId(defaultNotebookId || (notebooks.length > 0 ? notebooks[0].id : ''))
    }
  }, [isOpen, defaultNotebookId, notebooks])

  if (!isOpen) return null

  const cambridgeUrl = english.trim()
    ? `https://dictionary.cambridge.org/zht/dictionary/english-chinese-traditional/${encodeURIComponent(english.trim())}`
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!english.trim() || !chinese.trim() || !selectedNotebookId) return
    setLoading(true)
    await onSubmit({
      english: english.trim(),
      part_of_speech: partOfSpeech.trim(),
      chinese: chinese.trim(),
      notebookId: selectedNotebookId,
    })
    setLoading(false)
    onClose()
  }

  const isLocked = !!defaultNotebookId

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl"
      >
        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">
          Add New Card
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notebook selector — 鎖定時隱藏，未鎖定時顯示下拉 */}
          {!isLocked && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notebook
              </label>
              <select
                value={selectedNotebookId}
                onChange={(e) => setSelectedNotebookId(e.target.value)}
                className="input"
                required
              >
                <option value="" disabled>Select a notebook</option>
                {notebooks.map((nb) => (
                  <option key={nb.id} value={nb.id}>{nb.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* English + Cambridge link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              English
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                className="input"
                placeholder="e.g., serendipity"
                required
                autoFocus
              />
              <a
                href={cambridgeUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if (!cambridgeUrl) e.preventDefault() }}
                title="Look up in Cambridge Dictionary"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors whitespace-nowrap
                  ${cambridgeUrl
                    ? 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20'
                    : 'border-gray-200 text-gray-300 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Cambridge</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Part of speech */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Part of Speech
            </label>
            <input
              type="text"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
              className="input"
              placeholder="e.g., n, v, adj, phr"
            />
          </div>

          {/* Chinese */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chinese
            </label>
            <input
              type="text"
              value={chinese}
              onChange={(e) => setChinese(e.target.value)}
              className="input"
              placeholder="e.g., 意外發現美好事物的能力"
              required
            />
          </div>

          <div className="flex space-x-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={loading || !selectedNotebookId}
            >
              {loading ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}