import { useState } from 'react'
import { Card, Button } from './index'

type ESMModalProps = {
  isOpen: boolean
  onSubmit: (data: ESMData) => void
  onClose: () => void
  isSubmitting?: boolean
}

import type { CreateESMResponseData } from '../types/esm'

export type ESMData = {
  SL: number
  SO: number
  REF1: number
  REF2: number
  RUM1: number
  RUM2: number
  THK1: number
  THK2: number
}

export default function ESMModal({ isOpen, onSubmit, onClose, isSubmitting = false }: ESMModalProps) {
  const [formData, setFormData] = useState<ESMData>({
    SL: 0, // -50 ~ +50 범위의 중간값
    SO: 4,
    REF1: 4,
    REF2: 4,
    RUM1: 4,
    RUM2: 4,
    THK1: 4,
    THK2: 4
  })

  if (!isOpen) return null

  const handleSubmit = () => {
    if (isSubmitting) {
      return
    }

    if (onSubmit) {
      onSubmit(formData)
    }
  }

  const questions = [
    { id: 'SL', label: 'Q1. 이번 세션에서 글쓰기를 주도한 것은 누구였나요?', min: 'AI', max: '나' },
    { id: 'SO', label: 'Q2. 완성한 오늘의 일기가 완전히 내 것으로 느껴집니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'REF1', label: 'Q3. 이번 일기 쓰기를 통해 내 감정이나 행동을 더 잘 인식하게 되었습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'REF2', label: 'Q4. 이번 일기 쓰기는 나를 성찰할 수 있는 계기가 되었습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'RUM1', label: 'Q5. 이번 일기를 쓰면서, 부정적인 생각의 반복에서 벗어나기 어려웠습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'RUM2', label: 'Q6. 이번 일기 쓰기는 과거의 상황을 반복해서 곱씹게 만들었습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'THK1', label: 'Q7. 이번 일기 쓰기를 통해 내가 왜 그렇게 느끼는지를 이해하는 것이 중요하다고 느꼈습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' },
    { id: 'THK2', label: 'Q8. 이번 일기 쓰기를 통해 내 생각이 어떻게 생겨나는지를 이해하는 것이 중요하다고 느꼈습니다.', min: '전혀 동의하지 않음', max: '매우 동의함' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 모달 내용 */}
      <div className="relative max-w-lg h-[80vh] flex flex-col">
        <Card className="flex flex-col p-0 h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <div>
              <h2 className="text-balance text-xl font-bold text-gray-900 mb-2">글쓰기 세션 평가</h2>
            </div>
            {/* 질문들 */}
            <div className="space-y-4">
              <p className="text-pretty text-sm text-gray-600">작성 과정을 떠올리며 해당하는 정도를 선택해주세요.</p>

              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">
                    {question.label}
                  </label>
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={question.id === 'SL' ? '-50' : '1'}
                      max={question.id === 'SL' ? '50' : '7'}
                      value={formData[question.id as keyof ESMData] as number}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        [question.id]: parseInt(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider accent-emerald-400"
                    />
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>{question.min}</span>
                      <span>{question.max}</span>
                    </div>
                    <div className="w-full flex justify-center">
                      <span className="tabular-nums font-bold text-emerald-600">
                        {question.id === 'SL' && formData[question.id as keyof ESMData] > 0 ? '+' : ''}
                        {formData[question.id as keyof ESMData]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
          {/* 고정된 버튼 영역 */}
          <div className="flex-shrink-0 pt-4 border-t border-gray-200 bg-white">
            {/* 저장 중일 때 안내 메시지 추가 */}
            {isSubmitting && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                  <p className="text-pretty text-sm text-amber-800 font-medium">
                    일기를 저장하고 있습니다...
                  </p>
                </div>
                <p className="text-pretty text-xs text-amber-700 mt-1">
                  완료될 때까지 창을 닫지 말아주세요!
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <Button
                onClick={onClose}
                className="flex-1 bg-stone-300 text-stone-700 hover:bg-stone-400"
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-stone-700 text-white hover:bg-stone-800"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '저장하고 완료하기'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
