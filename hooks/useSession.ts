import { useCallback, useEffect, useRef, useState } from 'react'
import { User } from '../types/user'

interface SessionCheckResult {
  success: boolean
  needsLogin: boolean
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkSession = useCallback(async (): Promise<SessionCheckResult> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      // 401(세션 만료/무효)일 때만 로그아웃 처리한다.
      // 일시적 네트워크 오류나 서버 오류(5xx)로 user를 지우면
      // 작성 중이던 일기가 로그인 페이지 리다이렉트로 유실될 수 있다.
      if (response.status === 401) {
        setUser(null)
        setLoading(false)
        return { success: false, needsLogin: true }
      }

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.data?.isLoggedIn) {
        // 세션 상태를 확정할 수 없으므로 기존 user 상태는 유지
        setLoading(false)
        return { success: false, needsLogin: false }
      }

      setUser(data.data.user)
      setLoading(false)
      return { success: true, needsLogin: false }
    } catch (error) {
      console.error('세션 체크 중 오류:', error)
      // 네트워크 오류 — 기존 user 상태 유지
      setLoading(false)
      return { success: false, needsLogin: false }
    }
  }, [])

  useEffect(() => {
    checkSession()

    intervalRef.current = setInterval(() => {
      void checkSession()
    }, 5 * 60 * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkSession])

  const signOut = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('로그아웃 요청 중 오류:', error)
    } finally {
      setUser(null)
    }
  }

  const refreshSession = async () => {
    const result = await checkSession()
    return result.success
  }

  const refreshUser = async () => {
    const result = await checkSession()
    return result.success
  }

  return {
    user,
    loading,
    signOut,
    refreshSession,
    refreshUser,
    checkSession,
  }
}
