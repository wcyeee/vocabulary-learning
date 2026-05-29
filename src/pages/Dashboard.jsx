import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pin, Edit2, Trash2, PlayCircle, BookOpen } from 'lucide-react'
import { useNotebooks } from '../hooks/useNotebooks'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmModal from '../components/ConfirmModal'

export default function Dashboard() {
  const { notebooks, loading, createNotebook, updateNotebook, deleteNotebook, togglePin } = useNotebooks()
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (newNotebookName.trim()) {
      await createNotebook(newNotebookName.trim())
      setNewNotebookName('')
      setShowCreateModal(false)
    }
  }

  const handleEdit = async (id) => {
    if (editingName.trim()) {
      await updateNotebook(id, { name: editingName.trim() })
      setEditingId(null)
      setEditingName('')
    }
  }

  const handleDelete = (id) => {
    setConfirmModal({ open: true, id })
  }

  const startQuiz = (notebookId) => {
    navigate('/quiz', { state: { selectedNotebooks: [notebookId] } })
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading notebooks...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
            Your Notebooks
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organize your vocabulary into collections
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Notebook</span>
        </button>
      </div>

      {notebooks.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white mb-2">
            No notebooks yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first notebook to start learning
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Notebook</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {notebooks.map((notebook) => (
              <motion.div
                key={notebook.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card p-6 relative group"
              >
                {/* Pin Badge */}
                {notebook.is_pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin className="w-4 h-4 text-gray-400 fill-current" />
                  </div>
                )}

                {/* Notebook Header */}
                <div className="mb-4">
                  {editingId === notebook.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleEdit(notebook.id)}
                      onKeyPress={(e) => e.key === 'Enter' && handleEdit(notebook.id)}
                      className="input text-lg font-display font-semibold"
                      autoFocus
                    />
                  ) : (
                    <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white mb-1 pr-8">
                      {notebook.name}
                    </h3>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {notebook.createdAt ? new Date(notebook.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last review on：{notebook.last_tested_at ? new Date(notebook.last_tested_at).toLocaleDateString() : 'Never'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 py-4 border-y border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{notebook.total_cards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{notebook.normal_cards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Normal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">{notebook.familiar_cards}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Familiar</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => togglePin(notebook.id, notebook.is_pinned)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Toggle pin"
                    >
                      <Pin className={`w-4 h-4 ${notebook.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(notebook.id)
                        setEditingName(notebook.name)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(notebook.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/notebook/${notebook.id}`)}
                      className="btn-secondary text-sm py-1.5"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => startQuiz(notebook.id)}
                      className="btn-primary text-sm py-1.5 flex items-center space-x-1"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Quiz</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-4">
              Create New Notebook
            </h2>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="Notebook name"
                className="input mb-4"
                autoFocus
              />
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewNotebookName('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Notebook"
        message="Are you sure you want to delete this notebook? All cards will be deleted and this cannot be undone."
        confirmLabel="Delete"
        confirmClass="bg-red-500 hover:bg-red-700 text-white rounded-md px-4 py-2 transition-colors"
        onConfirm={async () => {
          await deleteNotebook(confirmModal.id)
          setConfirmModal({ open: false, id: null })
        }}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  )
}
