import { useState, useEffect } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { motion } from 'framer-motion'
import SpeakButton from '../components/SpeakButton'

export default function AllCards() {
  const [cards, setCards] = useState([])
  const [filteredCards, setFilteredCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('alpha') // 'alpha', 'date', 'review', 'status'
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    fetchAllCards()
  }, [])

  useEffect(() => {
    filterAndSortCards()
  }, [cards, searchQuery, sortBy, sortOrder])

  const fetchAllCards = async () => {
    try {
      setLoading(true)
      // Get all notebooks first
      const notebooksSnap = await getDocs(collection(db, 'notebooks'))
      const notebooks = {}
      notebooksSnap.docs.forEach(d => { notebooks[d.id] = d.data().name })

      // Get all cards from all notebooks
      let allCards = []
      for (const [notebookId, notebookName] of Object.entries(notebooks)) {
        // 確保這裡的欄位名稱 (createdAt) 與你資料庫中一致
        const cardsSnap = await getDocs(
          query(collection(db, 'notebooks', notebookId, 'cards'), orderBy('createdAt', 'desc'))
        )
        const cards = cardsSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          notebook: { name: notebookName }
        }))
        allCards = [...allCards, ...cards]
      }
      setCards(allCards)
    } catch (err) {
      console.error('Error fetching cards:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilReview = (card) => {
    if (card.status === 'new' || !card.next_review_at) {
      return 0
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reviewDate = new Date(card.next_review_at)
    
    // 防呆：如果日期解析失敗，直接回傳 0
    if (isNaN(reviewDate.getTime())) return 0

    const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate())
    
    const diffInMs = reviewDay - today
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    
    // 如果算出來不是數字 (NaN)，回傳 0
    if (isNaN(diffInDays)) return 0
    
    return diffInDays < 0 ? 0 : diffInDays
  }

  const filterAndSortCards = () => {
    let filtered = [...cards]

    // Search filter
    if (searchQuery) {
      const queryStr = searchQuery.toLowerCase()
      filtered = filtered.filter(card =>
        (card.english?.toLowerCase() || '').includes(queryStr) ||
        (card.chinese?.toLowerCase() || '').includes(queryStr) ||
        (card.part_of_speech?.toLowerCase() || '').includes(queryStr)
      )
    }

    // Sort
    if (sortBy === 'alpha') {
      filtered.sort((a, b) => {
        const result = (a.english || '').localeCompare(b.english || '')
        return sortOrder === 'asc' ? result : -result
      })
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => {
        // 修正：這裡改成跟上面一樣的大寫 'createdAt'，防呆加上 || 0 避免 Invalid Date
        const dateA = new Date(a.createdAt || 0)
        const dateB = new Date(b.createdAt || 0)
        const result = dateB - dateA
        return sortOrder === 'asc' ? result : -result
      })
    } else if (sortBy === 'review') {
      filtered.sort((a, b) => {
        const daysA = getDaysUntilReview(a)
        const daysB = getDaysUntilReview(b)
        const result = daysA - daysB
        return sortOrder === 'asc' ? result : -result
      })
    } else if (sortBy === 'status') {
      filtered.sort((a, b) => {
        const statusOrder = { 'new': 0, 'normal': 1, 'familiar': 2 }
        const scoreA = statusOrder[a.status] ?? 0
        const scoreB = statusOrder[b.status] ?? 0
        const result = scoreA - scoreB
        return sortOrder === 'asc' ? result : -result
      })
    }

    setFilteredCards(filtered)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading all cards...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
          All Vocabulary
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse and search across all your cards
        </p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by English, Chinese, or part of speech..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
              title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
            >
              <ArrowUpDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              <option value="alpha">Alphabetical</option>
              <option value="date">Date Added</option>
              <option value="review">Days Until Review</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredCards.length} of {cards.length} cards
        </div>
      </div>

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
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="card p-5"
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
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-3">{card.chinese}</p>
                
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {card.notebook?.name || 'Unknown notebook'}
                  </span>
                  
                  {/* 修正：優化結構，避免三層 span 嵌套與 null 導致的 framer-motion 計算問題 */}
                  <div className="flex items-center">
                    {card.status !== 'new' && card.next_review_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-3">
                        Review in <strong className="font-bold">{daysLeft}</strong> day{daysLeft !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      card.status === 'new' ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 text-blue-700 dark:text-blue-300' :
                      card.status === 'normal' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' :
                      'bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-700 dark:text-green-300'
                    }`}>
                      {card.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}