// supabase/functions/openproject-proxy/index.ts
// Proxy for OpenProject API to avoid CORS issues in production

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openproject-url, x-openproject-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const openprojectUrl = req.headers.get('x-openproject-url')
    const openprojectApiKey = req.headers.get('x-openproject-api-key')

    if (!openprojectUrl || !openprojectApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing OpenProject URL or API Key headers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the API path from the request URL
    const url = new URL(req.url)
    const apiPath = url.searchParams.get('path') || '/api/v3/users/me'
    
    // Build the full OpenProject URL
    const targetUrl = `${openprojectUrl.replace(/\/$/, '')}${apiPath}`
    
    // Build auth header
    const authHeader = `Basic ${btoa(`apikey:${openprojectApiKey}`)}`

    // Forward the request to OpenProject
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Proxy request failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
