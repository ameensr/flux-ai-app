// src/features/panda-copilot/services/pandaAIService.ts
// AI layer for Panda Copilot — only invoked for genuinely AI-dependent requests.
// Uses the existing AIService integration. Never invoked for basic data queries.

import { AIService } from '@/services/ai/ai-service'
import type { ParsedQuery, PandaResponse } from '../types/pandaTypes'
import { classifyAIError, TEA_BREAK_MESSAGE } from '../types/pandaTypes'
import type { PandaAccessContext } from '../permissions/pandaAccessControl'
import { getSupportIssues, getReleaseTasks, getQAReports } from './pandaDataService'

const PANDA_AI_SYSTEM_PROMPT = `You are Panda, the Qaly AI Engine Copilot — a friendly, expert QA assistant.
You help QA teams analyze data, identify patterns, and generate insights.
Be concise, professional, and action-oriented. Use bullet points for clarity.
Only analyze data that has been explicitly provided to you. Never fabricate metrics or records.`

/**
 * Invoke AI for analysis requests.
 * Retrieves relevant authorized data first, then passes it to AI.
 * Returns a TEA_BREAK response for confirmed temporary outages.
 */
export async function invokeAIAnalysis(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  // Gather relevant context data first (rule-based, no AI)
  let contextData = ''

  try {
    const [supportRes, releaseRes] = await Promise.all([
      getSupportIssues(query, ctx).catch(() => null),
      getReleaseTasks(query, ctx).catch(() => null),
    ])

    if (supportRes?.supportIssues && supportRes.supportIssues.length > 0) {
      const issues = supportRes.supportIssues.slice(0, 10)
      contextData += `\n\nSupport Issues (${supportRes.totalCount} total):\n`
      contextData += issues.map(i =>
        `- ${i.issue_id}: ${i.description.slice(0, 80)} | Status: ${i.testing_status} | Tester: ${i.tester_name}`
      ).join('\n')
    }

    if (releaseRes?.releaseTasks && releaseRes.releaseTasks.length > 0) {
      const tasks = releaseRes.releaseTasks.slice(0, 10)
      contextData += `\n\nRelease Tasks (${releaseRes.totalCount} total):\n`
      contextData += tasks.map(t =>
        `- ${t.task_id}: ${t.description.slice(0, 80)} | Status: ${t.task_status} | Release: ${t.release_version}`
      ).join('\n')
    }
  } catch {
    // Context gathering failed — proceed with just the user query
  }

  const prompt = contextData
    ? `User question: ${query.raw}\n\nAvailable project data:${contextData}\n\nProvide a concise, actionable analysis based only on the data above.`
    : query.raw

  try {
    const aiText = await AIService.callAI({
      prompt,
      options: {
        systemPrompt: PANDA_AI_SYSTEM_PROMPT,
        module: 'ai-copilot',
        timeout: 60_000,
      },
    })

    return {
      type: 'AI_RESPONSE',
      title: 'Panda Analysis',
      aiText,
    }
  } catch (err: unknown) {
    const errorClass = classifyAIError(err)

    if (errorClass === 'TEA_BREAK') {
      return {
        type: 'TEA_BREAK',
        aiText: TEA_BREAK_MESSAGE,
        originalQuery: query.raw,
        canRetry: true,
        canShowData: contextData.length > 0,
      }
    }

    if (errorClass === 'TIMEOUT') {
      return {
        type: 'ERROR_STATE',
        errorMessage: 'The AI request timed out. Please try again in a moment.',
        originalQuery: query.raw,
        canRetry: true,
      }
    }

    if (errorClass === 'QUOTA_EXCEEDED') {
      return {
        type: 'ERROR_STATE',
        errorMessage: 'AI service quota exceeded. Please try again later or contact your administrator.',
      }
    }

    if (errorClass === 'AUTH_ERROR') {
      return {
        type: 'ERROR_STATE',
        errorMessage: 'AI service configuration error. Please contact your administrator.',
      }
    }

    if (errorClass === 'PERMISSION') {
      return {
        type: 'ERROR_STATE',
        errorMessage: "You don't have permission to use AI features.",
      }
    }

    const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return {
      type: 'ERROR_STATE',
      errorMessage: msg,
      originalQuery: query.raw,
      canRetry: true,
    }
  }
}
