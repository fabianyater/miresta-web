import type { Role } from '@/types'

// OWNER has every ADMIN capability plus user-hierarchy management (creating other
// admins, touching other owner accounts) — anything gated on "is admin" in the UI
// should treat OWNER the same way. The backend enforces the finer OWNER-only rules.
export function isAdminRole(role: Role | undefined): boolean {
  return role === 'ADMIN' || role === 'OWNER'
}
