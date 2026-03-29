import type { User } from '../types'
import { getItem, setItem, removeItem } from './storage'

const USERS_KEY = 'lager_users'
const CURRENT_USER_KEY = 'lager_current_user'

// Matches C#: Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password))).ToLowerInvariant()
async function hashPassword(password: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function seedDefaultAdmin(): Promise<void> {
  const users = getItem<User[]>(USERS_KEY) ?? []
  if (users.length === 0) {
    const hash = await hashPassword('admin123')
    users.push({
      Id: crypto.randomUUID(),
      Email: 'admin@lager.se',
      Role: 'admin',
      PasswordHash: hash,
    })
    setItem(USERS_KEY, users)
  }
}

export async function login(email: string, password: string): Promise<User | null> {
  const users = getItem<User[]>(USERS_KEY) ?? []
  const hash = await hashPassword(password)
  const user = users.find(
    u => u.Email.toLowerCase() === email.toLowerCase() && u.PasswordHash === hash
  )
  if (!user) return null
  setItem(CURRENT_USER_KEY, user)
  return user
}

export function logout(): void {
  removeItem(CURRENT_USER_KEY)
}

export function getCurrentUser(): User | null {
  return getItem<User>(CURRENT_USER_KEY)
}
