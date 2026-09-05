interface JwtPayload {
  exp?: number
  sub?: string
  role?: string
  [key: string]: unknown
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    const json = decodeURIComponent(
      escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}
