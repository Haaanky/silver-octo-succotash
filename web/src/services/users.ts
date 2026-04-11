import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'worker'
}

export interface InviteUserResult {
  userId?: string
}

interface FunctionsErrorLike {
  context?: Response
  message?: string
}

function isFunctionsErrorLike(error: unknown): error is FunctionsErrorLike {
  return typeof error === 'object' && error !== null
}

/**
 * Extracts the human-readable error message from a Supabase Functions error.
 * When the Edge Function returns a non-2xx response, supabase.functions.invoke sets
 * `error` with a generic message like "Edge Function returned a non-2xx status code".
 * The actual Swedish error text is in the JSON response body; this helper reads it.
 */
async function extractFunctionsError(error: unknown): Promise<Error> {
  if (isFunctionsErrorLike(error) && error.context instanceof Response) {
    try {
      const body = await error.context.clone().json() as { error?: string }
      if (body?.error) return new Error(body.error)
    } catch {
      // json parse failed – fall through to generic message
    }
  }
  return error instanceof Error ? error : new Error('Okänt fel')
}

export async function listUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'list' },
  })
  if (error) throw await extractFunctionsError(error)

  if (Array.isArray(data)) {
    return data as UserProfile[]
  }

  return (data?.users as UserProfile[] | undefined) ?? []
}

export async function inviteUser(email: string): Promise<InviteUserResult> {
  const { data, error } = await supabase.functions.invoke<InviteUserResult>('invite-user', {
    body: { action: 'invite', email },
  })
  if (error) throw await extractFunctionsError(error)
  return data ?? {}
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('invite-user', {
    body: { action: 'delete', userId },
  })
  if (error) throw await extractFunctionsError(error)
}
