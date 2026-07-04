import type { NextApiRequest, NextApiResponse } from 'next'
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import {
  createClient as createSupabaseClient,
  type AuthError,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js'
import { getPublicSupabaseConfig, getServerSupabaseConfig } from './env'

function appendSetCookieHeaders(
  res: NextApiResponse,
  cookies: string[]
): void {
  const existingHeader = res.getHeader('Set-Cookie')
  const existingCookies = Array.isArray(existingHeader)
    ? existingHeader.map(String)
    : existingHeader
      ? [String(existingHeader)]
      : []

  res.setHeader('Set-Cookie', [...existingCookies, ...cookies])
}

export function createServerSupabaseClient(
  req: NextApiRequest,
  res: NextApiResponse
): SupabaseClient {
  const { url, publishableKey } = getPublicSupabaseConfig()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? '')
          .filter(
            (cookie): cookie is { name: string; value: string } =>
              typeof cookie.value === 'string'
          )
      },
      setAll(cookiesToSet, headers) {
        appendSetCookieHeaders(
          res,
          cookiesToSet.map(({ name, value, options }) =>
            serializeCookieHeader(name, value, options)
          )
        )

        Object.entries(headers).forEach(([name, value]) => {
          res.setHeader(name, value)
        })
      },
    },
  })
}

export function createAdminSupabaseClient(): SupabaseClient {
  const { url, secretKey } = getServerSupabaseConfig()

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

function extractBearerToken(req: NextApiRequest): string | undefined {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return undefined
  }

  return authorization.slice(7)
}

export async function getAuthenticatedUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{
  supabase: SupabaseClient
  user: User | null
  error: AuthError | null
}> {
  const supabase = createServerSupabaseClient(req, res)
  const bearerToken = extractBearerToken(req)
  const {
    data: { user },
    error,
  } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser()

  return { supabase, user, error }
}
