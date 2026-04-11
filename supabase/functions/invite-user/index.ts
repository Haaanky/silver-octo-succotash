import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getSafeInviteErrorMessage(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''

  if (
    message.includes('already been invited') ||
    message.includes('user already registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  ) {
    return 'Användaren är redan inbjuden eller registrerad'
  }

  if (message.includes('invalid email')) {
    return 'Ogiltig e-postadress'
  }

  return 'Kunde inte skicka inbjudan just nu'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: 'Serverkonfiguration saknas: SUPABASE_URL, SUPABASE_ANON_KEY eller SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Saknar authorization-header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verifiera att anroparen är inloggad
  const supabaseUser = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Obehörig' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verifiera att anroparen är admin
  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
  )
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return new Response(JSON.stringify({ error: 'Kunde inte verifiera admin-behörighet' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Åtkomst nekad – endast admin' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { action: string; email?: string; userId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Ogiltig JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── list ──────────────────────────────────────────────────────────────────
  if (body.action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .order('email')
    if (error) {
      console.error('List users error:', error.message)
      return new Response(JSON.stringify({ error: 'Kunde inte hämta användare' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ users: data ?? [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── invite ────────────────────────────────────────────────────────────────
  if (body.action === 'invite') {
    if (!body.email) {
      return new Response(JSON.stringify({ error: 'E-post saknas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(body.email)
    if (error) {
      console.error('Invite user failed:', error)
      return new Response(JSON.stringify({ error: getSafeInviteErrorMessage(error) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // data.user?.id can be undefined in some GoTrue configurations even on success.
    // Fall back to querying the profiles table (created synchronously via trigger).
    let userId: string | null = data.user?.id ?? null
    if (!userId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', body.email)
        .maybeSingle()
      if (profileError) {
        console.error('Profile lookup fallback failed:', profileError.message)
      }
      userId = profile?.id ?? null
    }
    const responseBody = userId ? { success: true, userId } : { success: true }
    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (body.action === 'delete') {
    if (!body.userId) {
      return new Response(JSON.stringify({ error: 'userId saknas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // Hindra admin från att ta bort sig själv
    if (body.userId === user.id) {
      return new Response(JSON.stringify({ error: 'Du kan inte ta bort ditt eget konto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(body.userId)
    if (error) {
      console.error('Delete user failed:', error.message)
      const msg = /not found/i.test(error.message)
        ? 'Användaren hittades inte'
        : 'Kunde inte ta bort användaren'
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Okänd åtgärd' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
