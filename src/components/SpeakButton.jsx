import { Volume2 } from 'lucide-react'
import { useSpeech } from '../hooks/useSpeech'

export default function SpeakButton({ text, size = 'md', className = '' }) {
  const { speak } = useSpeech()

  const sizeClasses = {
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-10 h-10 p-2'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation() // 防止觸發父元素的點擊事件
        speak(text)
      }}
      className={`${sizeClasses[size]} bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded transition-colors flex items-center justify-center ${className}`}
      title="Play pronunciation"
      type="button"
    >
      <Volume2 className={iconSizes[size]} />
    </button>
  )
}