import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { collection, getDocs, doc, updateDoc, query, where  } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { calculateNextReview, getDueCards, shuffleArray } from '../utils/srmAlgorithm'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import SpeakButton from '../components/SpeakButton'
import { useSpeech } from '../hooks/useSpeech'
import ConfirmModal from '../components/ConfirmModal'

export default function Quiz() {
  const location = useLocation()
  const navigate = useNavigate()
  const { speak } = useSpeech()
  
  const [notebooks, setNotebooks] = useState([])
  const [selectedNotebooks, setSelectedNotebooks] = useState(location.state?.selectedNotebooks || [])
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  const [sessionResults, setSessionResults] = useState({
    familiar: [],
    normal: [],
    again: []
  })

  const [infoModal, setInfoModal] = useState({ open: false, message: '' })

  useEffect(() => {
    fetchNotebooks()
  }, [])

  useEffect(() => {
  const handleKeyPress = (e) => {
    // 只在測驗進行中且卡片已翻開時啟用
    if (!quizStarted || quizComplete) return

    // V 鍵發音（隨時可用）
    if (e.code === 'KeyV') {
      e.preventDefault()
      speak(cards[currentIndex].english)
    }

    // 空白鍵翻牌
    if (e.code === 'Space') {
      e.preventDefault()
      setIsFlipped(!isFlipped)
    }
    
    // 只有翻開後才能按數字鍵
    if (isFlipped) {
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault()
        handleAction('again')
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault()
        handleAction('normal')
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault()
        handleAction('familiar')
      }
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [quizStarted, quizComplete, isFlipped, currentIndex])

  const fetchNotebooks = async () => {
    const snapshot = await getDocs(collection(db, 'notebooks'))
    setNotebooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  const startQuiz = async () => {
    let allCards = []
    for (const notebookId of selectedNotebooks) {
      const snapshot = await getDocs(collection(db, 'notebooks', notebookId, 'cards'))
      
      // 修正：在對應資料時，手動幫卡片加上 notebook_id 屬性
      const cards = snapshot.docs.map(d => ({ 
        id: d.id, 
        notebook_id: notebookId, 
        ...d.data() 
      }))
      allCards = [...allCards, ...cards]
    }
    const dueCards = getDueCards(allCards)
    const shuffled = shuffleArray(dueCards)
    if (shuffled.length === 0) {
      setInfoModal({ open: true, message: 'No cards due for review! Come back later or add new cards.' })
      return
    }
    setCards(shuffled)
    setQuizStarted(true)
  }

  const handleAction = async (action) => {
    const currentCard = cards[currentIndex]

    if (action === 'again') {
      setCards([...cards, currentCard])
      setSessionResults(prev => ({ ...prev, again: [...prev.again, currentCard] }))
    } else {
      const updates = calculateNextReview(currentCard, action)
      await updateDoc(
        doc(db, 'notebooks', currentCard.notebook_id, 'cards', currentCard.id),
        updates
      )
      setSessionResults(prev => ({
        ...prev,
        [action]: [...prev[action], { ...currentCard, ...updates }]
      }))
    }

    setIsFlipped(false)

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Update last_tested_at for all notebooks
      const uniqueNotebookIds = [...new Set(cards.map(c => c.notebook_id))]
      for (const notebookId of uniqueNotebookIds) {
        await updateDoc(doc(db, 'notebooks', currentCard.notebook_id), {
          last_tested_at: new Date().toISOString()
        })
      }
      setQuizComplete(true)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const restartQuiz = () => {
    setQuizComplete(false)
    setQuizStarted(false)
    setCards([])
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionResults({ familiar: [], normal: [], again: [] })
  }

  // Selection Screen
  if (!quizStarted) {
    return (
      <div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors dark:text-gray-300 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Start Quiz
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select notebooks to include in your study session
            </p>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Notebooks
            </h2>
            <div className="space-y-2">
              <label htmlFor="selectAll" className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input type="checkbox" id="selectAll" onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedNotebooks(notebooks.map(n => n.id))
                  } else {
                    setSelectedNotebooks([])
                  }
                }} className="w-4 h-4 text-gray-900 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-gray-500"
                />
                <span className="font-bold ml-3 text-gray-900 dark:text-white">Select All</span>
              </label>
              {notebooks.map(notebook => (
                <label
                  key={notebook.id}
                  className="flex items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedNotebooks.includes(notebook.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNotebooks([...selectedNotebooks, notebook.id])
                      } else {
                        setSelectedNotebooks(selectedNotebooks.filter(id => id !== notebook.id))
                      }
                    }}
                    className="w-4 h-4 text-gray-900 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded focus:ring-gray-500"
                  />
                  <span className="ml-3 text-gray-900 dark:text-white">{notebook.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={selectedNotebooks.length === 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Quiz
          </button>
        </div>

        <ConfirmModal
          isOpen={infoModal.open}
          title="Notice"
          message={infoModal.message}
          confirmLabel="OK"
          confirmClass="btn-primary"
          onConfirm={() => setInfoModal({ open: false, message: '' })}
          onCancel={() => setInfoModal({ open: false, message: '' })}
        />
      </div>
    )
  }

  // Results Screen
  if (quizComplete) {
    const totalReviewed = sessionResults.familiar.length + sessionResults.normal.length
    const uniqueAgainCards = [...new Set(sessionResults.again.map(c => c.id))]
    
    const chartData = [
      { name: 'Familiar', value: sessionResults.familiar.length, color: '#10b981' },
      { name: 'Normal', value: sessionResults.normal.length, color: '#6b7280' },
    ]

    return (
      <div>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
              Quiz Complete!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Great job! Here's your session summary
            </p>
          </div>

          <div className="card p-8 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col justify-center space-y-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalReviewed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cards Reviewed</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg">
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400">{sessionResults.familiar.length}</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Marked Familiar</div>
                </div>
                <div className="text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">{sessionResults.normal.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Marked Normal</div>
                </div>
                {uniqueAgainCards.length > 0 && (
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-lg">
                    <div className="text-3xl font-bold text-red-700 dark:text-red-400">{uniqueAgainCards.length}</div>
                    <div className="text-sm text-red-600 dark:text-red-400">Needed Review</div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {sessionResults.familiar.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">
                    Familiar Cards ({sessionResults.familiar.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sessionResults.familiar.map(card => (
                      <div key={card.id} className="p-2 bg-green-50 dark:bg-green-900/30 rounded text-sm">
                        <div className="font-medium text-gray-900 dark:text-green-100">{card.english}</div>
                        <div className="text-gray-600 dark:text-green-300 text-xs">{card.chinese}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessionResults.normal.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Normal Cards ({sessionResults.normal.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {sessionResults.normal.map(card => (
                      <div key={card.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{card.english}</div>
                        <div className="text-gray-600 dark:text-gray-400 text-xs">{card.chinese}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uniqueAgainCards.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">
                    Cards That Needed Review ({uniqueAgainCards.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {uniqueAgainCards.map(cardId => {
                      const card = sessionResults.again.find(c => c.id === cardId)
                      return (
                        <div key={cardId} className="p-2 bg-red-50 dark:bg-red-900/30 rounded text-sm">
                          <div className="font-medium text-gray-900 dark:text-red-100">{card.english}</div>
                          <div className="text-gray-600 dark:text-red-300 text-xs">{card.chinese}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <button onClick={() => navigate('/')} className="btn-secondary flex-1">
              Back to Dashboard
            </button>
            <button onClick={restartQuiz} className="btn-primary flex-1 flex items-center justify-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>New Quiz</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Screen
  const currentCard = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gray-800 dark:bg-gray-300 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="mb-6">
          <div
            key={currentCard.id}
            className={`flip-card ${isFlipped ? 'flipped' : ''} cursor-pointer`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="flip-card-inner h-96">
              {/* Front */}
              <div className="flip-card-front">
                <div className="card h-full flex flex-col items-center justify-center p-8">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <div className="text-5xl font-display font-bold text-gray-900 dark:text-white">
                        {currentCard.english}
                      </div>
                      <SpeakButton text={currentCard.english} size="lg" className="rounded-full"/>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Click to reveal</p>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="flip-card-back">
                <div className="card h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-700">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="text-5xl font-display font-bold text-gray-900 dark:text-white">
                        {currentCard.english}
                      </div>
                      <SpeakButton text={currentCard.english} size="lg" className="rounded-full"/>
                    </div>
                    <div className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-sm mb-6">
                      {currentCard.part_of_speech}
                    </div>
                    <div className="text-3xl text-gray-800 dark:text-white">
                      {currentCard.chinese}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === cards.length - 1}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-4"
          >
            <button
              onClick={() => handleAction('again')}
              className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 rounded-lg font-medium transition-colors"
            >
              <div className="text-sm mb-1">Again</div>
              <div className="text-xs opacity-75">Review now</div>
            </button>
            <button
              onClick={() => handleAction('normal')}
              className="p-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              <div className="text-sm mb-1">Normal</div>
              <div className="text-xs opacity-75">1 day</div>
            </button>
            <button
              onClick={() => handleAction('familiar')}
              className="p-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg font-medium transition-colors"
            >
              <div className="text-sm mb-1">Familiar</div>
              <div className="text-xs opacity-75">
                {currentCard.consecutive_familiar_count === 0 && '2 days'}
                {currentCard.consecutive_familiar_count === 1 && '4 days'}
                {currentCard.consecutive_familiar_count >= 2 && '8 days'}
              </div>
            </button>
          </motion.div>
        )}

        {!isFlipped && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Click the card to reveal the answer
          </div>
        )}
      </div>
    </div>
  )
}
