import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ExportModal({ isOpen, onClose, cards, title = 'Export Cards' }) {
  const [format, setFormat] = useState('excel')

  if (!isOpen) return null

  const exportExcel = () => {
    const data = cards.map((card, i) => ({
      '#': i + 1,
      English: card.english,
      'Part of Speech': card.part_of_speech || '',
      Chinese: card.chinese,
      Status: card.status || 'new',
      Notebook: card.notebook?.name || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 4 }, { wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary')
    XLSX.writeFile(wb, `${title}.xlsx`)
    onClose()
  }

  const exportPDF = () => {
    const rows = cards.map((card, i) =>
      `<tr>
        <td>${i + 1}</td>
        <td><strong>${card.english}</strong></td>
        <td style="color:#666;font-size:12px">${card.part_of_speech || ''}</td>
        <td>${card.chinese}</td>
        <td><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${card.status === 'familiar' ? '#d1fae5' : card.status === 'new' ? '#dbeafe' : '#f3f4f6'};color:${card.status === 'familiar' ? '#065f46' : card.status === 'new' ? '#1e40af' : '#374151'}">${card.status || 'new'}</span></td>
        ${card.notebook ? `<td style="font-size:12px;color:#888">${card.notebook.name}</td>` : ''}
      </tr>`
    ).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: sans-serif; padding: 32px; }
      h1 { font-size: 22px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 13px; border-bottom: 2px solid #e5e7eb; }
      td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
      tr:hover td { background: #fafafa; }
    </style></head><body>
    <h1>${title} (${cards.length} cards)</h1>
    <table><thead><tr>
      <th>#</th><th>English</th><th>POS</th><th>Chinese</th><th>Status</th>${cards[0]?.notebook ? '<th>Notebook</th>' : ''}
    </tr></thead><tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print()}<\/script>
    </body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Export <strong>{cards.length}</strong> cards
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportExcel}
            className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Excel (.xlsx)</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex flex-col items-center gap-2 p-4 border-2 border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FileText className="w-8 h-8 text-red-500 dark:text-red-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">PDF (Print)</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}