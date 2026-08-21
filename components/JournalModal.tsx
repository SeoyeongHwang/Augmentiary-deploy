import { XMarkIcon } from "@heroicons/react/24/outline"
import { Card } from './index'
import { formatKSTStored } from '../lib/time'
import { sanitizeHtml } from '../utils/sanitizeHtml'

type JournalModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string
  createdAt: string
  loading?: boolean
}

export default function JournalModal({ isOpen, onClose, title, content, createdAt, loading = false }: JournalModalProps) {
  if (!isOpen) return null

  // 날짜 포맷팅 (KST 기준)
  const formatDate = (dateString: string) => {
    return formatKSTStored(dateString)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 모달 내용 */}
      <div className="relative w-full max-w-2xl h-[70vh] flex flex-col">
        <Card className="relative flex flex-col h-full">
          {/* 헤더 영역 (고정) */}
          <div className="flex-shrink-0 pb-4 border-b border-gray-200">
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              aria-label="일기 닫기"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-[background-color,color,transform] duration-150 ease-out hover:bg-stone-100 hover:text-gray-600 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            {/* 제목과 날짜 */}
            <div className="pr-12">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <h2 className="font-serif text-2xl font-bold text-gray-900 mb-2">{title || '무제'}</h2>
                  <p className="text-sm text-gray-500">{formatDate(createdAt)}</p>
                </>
              )}
            </div>
          </div>
          
          {/* 본문 영역 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-pretty text-gray-500 text-sm">일기를 불러오는 중...</p>
                </div>
              </div>
            ) : (
              <div
                className="prose prose-sm max-w-none font-serif leading-loose"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
