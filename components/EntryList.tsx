// components/EntryList.tsx

import { useEffect, useState } from 'react'
import { formatKSTStored } from '../lib/time'

type Entry = {
  id: string
  title: string
  content_html: string
  created_at: string
  feedback?: string
}

type Props = {
  // 더 이상 userId가 필요하지 않음 - 세션에서 자동으로 처리
}

export default function EntryList({}: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  // 일기 목록 불러오기
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setLoading(true)
        
        // 서버사이드 API로 일기 목록 조회
        const response = await fetch('/api/entries/list', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('일기 목록 조회 실패:', data.error)
          if (response.status === 401) {
            // 세션 만료된 경우
            console.log('세션이 만료되었습니다.')
          }
          setLoading(false)
          return
        }

        console.log('✅ EntryList 일기 목록 조회 성공:', data.data.entries.length + '개')
        setEntries(data.data.entries || [])
      } catch (error) {
        console.error('일기 목록 불러오기 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
  }, [])

  return (
    <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">📘 이전 일기 목록</h2>

        {loading && <p>불러오는 중...</p>}

        {entries.length === 0 && !loading && (
            <p className="text-gray-500">아직 저장된 일기가 없습니다.</p>
        )}

        <ul className="space-y-4">
        {entries.map((entry) => (
            <li key={entry.id} className="p-4 border rounded">
            <p className="text-sm text-gray-400 mb-1">
                {formatKSTStored(entry.created_at)}
            </p>
            <p className="mb-2 whitespace-pre-wrap">{entry.content_html}</p>
            {entry.feedback && (
                <div className="mt-2 p-2 bg-purple-50 border rounded text-sm">
                <p className="font-semibold mb-1">💬 AI 피드백</p>
                <p>{entry.feedback}</p>
                </div>
            )}
            </li>
        ))}
        </ul>
    </div>
  )
}
