function requireValue(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getPublicSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return {
    url: requireValue(url, 'SUPABASE_URL'),
    publishableKey: requireValue(
      publishableKey,
      'SUPABASE_PUBLISHABLE_KEY'
    ),
  }
}

export function getServerSupabaseConfig() {
  const publicConfig = getPublicSupabaseConfig()
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  return {
    ...publicConfig,
    secretKey: requireValue(secretKey, 'SUPABASE_SECRET_KEY'),
  }
}
