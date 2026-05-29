import { motion } from 'framer-motion'

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', confirmClass = 'btn-primary', onConfirm, onCancel }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl"
      >
        <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{message}</p>
        <div className="flex space-x-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className={`${confirmClass} flex-1`}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}