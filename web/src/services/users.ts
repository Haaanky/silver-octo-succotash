import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'worker'
}

export async function listUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .order('email')
  if (error) throw error
  return data ?? []
}

export async function inviteUser(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'invite', email },
  })
  if (error) throw error
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'delete', userId },
  })
  if (error) throw error
}
