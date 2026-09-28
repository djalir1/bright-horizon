import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const action = url.searchParams.get('action') ?? payload.action

  try {
    if (action === 'login') {
      const { username, password } = payload as { username?: string; password?: string }
      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, error: 'Username and password are required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      
      // Check agents table
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('status', 'active')
        .single()

      if (error || !agent) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      // Update last login
      await supabase.from('agents').update({ last_login: new Date().toISOString() }).eq('id', agent.id)

      return new Response(JSON.stringify({
        success: true,
        data: { username: agent.username, name: agent.name, role: agent.role }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
