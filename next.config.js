/** @type {import('next').NextConfig} */
const publicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const publicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/supabase-js'],
  env: {
    ...(publicSupabaseUrl
      ? { NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl }
      : {}),
    ...(publicSupabasePublishableKey
      ? {
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            publicSupabasePublishableKey,
        }
      : {}),
  },
  
  // 프로덕션에서 console.log 제거 (Next.js 15 권장 방식)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
}

module.exports = nextConfig
