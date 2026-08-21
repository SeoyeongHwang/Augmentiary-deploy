// pages/index.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { Button, Heading, JournalCard, JournalModal } from '../components'
import type { Entry } from '../types/entry'

import { useSession } from '../hooks/useSession'

export default function Home() {
  const { user, loading: sessionLoading, signOut } = useSession()
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // 프로필이 비어있는지 확인하는 헬퍼 함수
  const isProfileEmpty = (profile: any): boolean => {
    if (!profile) return true
    
    // 문자열인 경우
    if (typeof profile === 'string') {
      return profile.trim() === ''
    }
    
    // 객체인 경우
    if (typeof profile === 'object') {
      // null이나 빈 객체인지 확인
      return profile === null || Object.keys(profile).length === 0
    }
    
    return true
  }

  // 사용자가 로그인되어 있으면 일기 목록 가져오기
  useEffect(() => {
    if (!sessionLoading && user) {
      // profile 데이터 디버깅
      console.log('🔍 user.profile 디버깅:', {
        profile: user.profile,
        type: typeof user.profile,
        isString: typeof user.profile === 'string',
        isObject: typeof user.profile === 'object',
        isNull: user.profile === null,
        isUndefined: user.profile === undefined
      })
      
      // profile이 비어있으면 설문 페이지로 이동
      const hasProfile = user.profile && 
        ((typeof user.profile === 'string' && user.profile.trim() !== '') ||
         (typeof user.profile === 'object' && user.profile !== null))
      
      if (!hasProfile) {
        console.log('📝 프로필이 비어있음 - 설문 페이지로 이동')
        router.push('/survey')
        return
      }
      
      fetchEntries(true) // 초기 로딩
    } else if (!sessionLoading && !user) {
      router.push('/login')
    }
  }, [user, sessionLoading, router])

  const fetchEntries = async (reset = false) => {
    try {
      if (reset) {
        setEntriesLoading(true)
        setOffset(0)
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }
      
      const currentOffset = reset ? 0 : offset
      const limit = 20 // 한 번에 20개씩 로드

      // 서버사이드 API로 일기 목록 조회
      const response = await fetch(`/api/entries/list?limit=${limit}&offset=${currentOffset}`, {
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
          // 세션 만료된 경우 로그인 페이지로 이동
          router.push('/login')
        }
        return
      }

      const newEntries = data.data.entries || []
      console.log('✅ 일기 목록 조회 성공:', newEntries.length + '개')

      if (reset) {
        setEntries(newEntries)
      } else {
        setEntries(prev => [...prev, ...newEntries])
      }

      // 더 로드할 데이터가 있는지 확인
      setHasMore(newEntries.length === limit)
      setOffset(currentOffset + newEntries.length)

    } catch (error) {
      console.error('일기 목록 불러오기 오류:', error)
    } finally {
      setEntriesLoading(false)
      setLoadingMore(false)
    }
  }

  // 무한 스크롤을 위한 Intersection Observer 설정
  const lastEntryRef = useCallback((node: HTMLDivElement) => {
    if (entriesLoading || loadingMore) return
    
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchEntries(false)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [entriesLoading, loadingMore, hasMore])

  const handleCardClick = (entry: Entry) => {
    setSelectedEntry(entry)
    setShowModal(true)
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 6) return '밤이 깊었습니다.'
    if (hour < 12) return '오늘 하루 잘 시작하셨나요?'
    if (hour < 18) return '안녕하세요.'
    return '오늘 하루는 어떠셨나요?'
  }

  // 세션 로딩 중이면 로딩 화면 표시
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-gray-600">로딩 중...</div>
          <div className="text-sm text-gray-400 mt-2">세션 확인 중</div>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우 (useEffect에서 리다이렉트 처리)
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-gray-600">로그인 페이지로 이동 중...</div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf9f5]">
      {/* Header */}
      <header className="h-20 bg-[#faf9f5]">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <Heading level={1} className="font-serif text-xl font-bold tracking-[-0.015em] text-stone-900">
            Augmentiary
          </Heading>
          <button
            type="button"
            onClick={handleLogout}
            className="-mr-3 min-h-10 rounded-lg px-3 text-sm font-medium text-stone-600 transition-[color,background-color,transform] duration-150 ease-out hover:bg-black/[0.04] hover:text-stone-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f5]"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* 인사말 */}
        <div className="mt-16 mb-8 text-center">
          <h1 className="text-balance text-4xl font-bold text-gray-900">
            <span className="font-bold">{user.name}님</span>, {getGreeting()}
          </h1>
        </div>

        {/* 작성하러 가기 버튼 */}
        <div className="mb-16 text-center">
          <Button
            onClick={() => router.push('/write')}
            className="px-8 py-4 text-lg font-semibold"
          >
            작성하러 가기
          </Button>
        </div>

        {/* 이전 일기 카드 그리드 */}
        <div className="mb-8">
          <h2 className="mb-6 text-balance text-center text-xl font-semibold text-gray-900">이전 일기</h2>
          
          {entriesLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">불러오는 중...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">아직 작성된 일기가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  ref={index === entries.length - 1 ? lastEntryRef : undefined}
                >
                  <JournalCard
                    id={entry.id}
                    title={entry.title}
                    content={entry.content_html}
                    createdAt={entry.created_at}
                    onClick={() => handleCardClick(entry)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 더 로딩 중일 때 표시 */}
          {loadingMore && (
            <div className="text-center py-8">
              <p className="text-gray-500">더 많은 일기를 불러오는 중...</p>
            </div>
          )}

          {/* 모든 일기를 다 불러왔을 때 */}
          {!hasMore && entries.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">모든 일기를 불러왔습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 일기 모달 */}
      {selectedEntry && (
        <JournalModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setSelectedEntry(null)
          }}
          title={selectedEntry.title}
          content={selectedEntry.content_html}
          createdAt={selectedEntry.created_at}
        />
      )}
    </main>
  )
}
