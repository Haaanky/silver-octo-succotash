import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'worker'
}

export interface InviteUserResult {
  userId?: string
}

export async function listUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'list' },
  })
  if (error) throw error

  if (Array.isArray(data)) {
    return data as UserProfile[]
  }

  return (data?.users as UserProfile[] | undefined) ?? []
}

export async function inviteUser(email: string): Promise<InviteUserResult> {
  const { data, error } = await supabase.functions.invoke<InviteUserResult>('invite-user', {
    body: { action: 'invite', email },
  })
  if (error) throw error
  return data ?? {}
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'delete', userId },
  })
  if (error) throw error
}
