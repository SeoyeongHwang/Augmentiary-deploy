import { Card } from './index'
import { formatKSTStored } from '../lib/time'
import { htmlToPlainText } from '../utils/sanitizeHtml'
import { useEffect, useRef } from 'react'
import VanillaTilt from 'vanilla-tilt'

type JournalCardProps = {
  id: string
  title: string
  content: string
  createdAt: string
  onClick: () => void
}

export default function JournalCard({ id, title, content, createdAt, onClick }: JournalCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) {
      VanillaTilt.init(cardRef.current, {
        max: 15, // 최대 틸트 각도
        speed: 400, // 애니메이션 속도
        glare: true, // 글로우 효과
        'max-glare': 0.3, // 최대 글로우 강도
        scale: 1.02, // 호버 시 살짝 확대
        perspective: 1000, // 3D 원근감
        easing: 'cubic-bezier(.03,.98,.52,.99)', // 부드러운 이징
        gyroscope: false, // 자이로스코프 비활성화 (모바일에서 불필요한 움직임 방지)
      })
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (cardRef.current && (cardRef.current as any).vanillaTilt) {
        (cardRef.current as any).vanillaTilt.destroy()
      }
    }
  }, [])

  // 내용 미리보기 (100자 제한)
  const plainText = htmlToPlainText(content)
  const preview = plainText.substring(0, 100) + (plainText.length > 100 ? '...' : '')

  // 날짜 포맷팅 (KST 기준)
  const formatDate = (dateString: string) => {
    return formatKSTStored(dateString)
  }

  return (
    <Card 
      ref={cardRef}
      className="cursor-pointer transition-all duration-300 ease-out hover:shadow-xl"
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{title}</h3>
        <p className="text-sm text-gray-600 line-clamp-3">{preview}</p>
        <p className="text-xs text-gray-400">{formatDate(createdAt)}</p>
      </div>
    </Card>
  )
} 