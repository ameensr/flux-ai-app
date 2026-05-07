// src/services/ai/promptService.ts
// Admin-only service for managing module system prompts.
// Regular users have no access to this service.

import { supabase } from '@/lib/supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
}

export interface ModulePrompt {
  id: string
  module_key: string
  module_name: string
  system_prompt: string
  is_active: boolean
  version: number
  temperature: number | null
  max_tokens: number | null
  created_at: string
  updated_at: string
}

export interface PromptVersion {
  id: string
  version: number
  system_prompt: string
  changed_by: string
  created_at: string
}

export interface CreatePromptPayload {
  module_key: string
  module_name: string
  system_prompt: string
  is_active?: boolean
  temperature?: number | null
  max_tokens?: number | null
}

export type UpdatePromptPayload = Partial<Omit<CreatePromptPayload, 'module_key' | 'module_name'>>

export const promptService = {
  async list(): Promise<ModulePrompt[]> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-prompt-config`, { headers })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async create(payload: CreatePromptPayload): Promise<ModulePrompt> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-prompt-config`, {
      method: 'POST', headers, body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async update(id: string, payload: UpdatePromptPayload): Promise<ModulePrompt> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-prompt-config?id=${id}`, {
      method: 'PUT', headers, body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async remove(id: string): Promise<void> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-prompt-config?id=${id}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error((await res.json()).error)
  },

  async getVersions(id: string): Promise<PromptVersion[]> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-prompt-config?id=${id}&action=versions`, { headers })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async testPrompt(moduleKey: string, userPrompt: string): Promise<string> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/ai-gateway`, {
      method: 'POST', headers,
      body: JSON.stringify({ prompt: userPrompt, module: moduleKey })
    })
    if (!res.ok) throw new Error((await res.json()).error)
    const data = await res.json()
    return data.content
  }
}

// Known modules — names match the actual UI titles shown to users
export const KNOWN_MODULES = [
  { key: 'test-case-generator', name: 'Test Architect' },
  { key: 'bug-refiner', name: 'Bug Refiner' },
  { key: 'writing-assistant', name: 'Writing Assistant' },
  { key: 'ai-copilot', name: 'Flux Copilot' },
  { key: 'sql-generator', name: 'SQL Generator' },
  { key: 'api-testing-assistant', name: 'API Testing Assistant' },
  { key: 'resume-analyzer', name: 'Resume Analyzer' },
  { key: 'ba-documentation', name: 'BA Documentation Generator' },
  { key: 'automation-script', name: 'Automation Script Generator' },
  { key: 'ui-review-assistant', name: 'UI Review Assistant' },
]
