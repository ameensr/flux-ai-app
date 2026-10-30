// supabase/functions/openproject-proxy/index.ts
// Proxy for OpenProject API to avoid CORS issues in production

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get credentials from POST body
    const body = await req.json()
    const openprojectUrl = body.openproject_url
    const openprojectApiKey = body.openproject_api_key

    if (!openprojectUrl || !openprojectApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing OpenProject URL or API Key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the API path from the request URL
    const url = new URL(req.url)
    const apiPath = url.searchParams.get('path') || '/api/v3/users/me'
    
    // Build the full OpenProject URL
    const targetUrl = `${openprojectUrl.replace(/\/$/, '')}${apiPath}`
    
    // Build auth header using Deno's base64 encoding
    const credentials = new TextEncoder().encode(`apikey:${openprojectApiKey}`)
    const authHeader = `Basic ${base64Encode(credentials)}`

    // Forward the request to OpenProject
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
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
