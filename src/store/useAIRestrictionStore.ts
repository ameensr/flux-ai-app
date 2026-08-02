// Global modal for AI access restriction notices.

import { create } from 'zustand'

interface AIRestrictionStore {
  open: boolean
  message: string
  show: (message?: string) => void
  close: () => void
}

export const AI_USER_RESTRICTED_MESSAGE =
  'You are restricted to use AI. Contact Administration.'

export const useAIRestrictionStore = create<AIRestrictionStore>((set) => ({
  open: false,
  message: AI_USER_RESTRICTED_MESSAGE,
  show: (message = AI_USER_RESTRICTED_MESSAGE) => set({ open: true, message }),
  close: () => set({ open: false }),
}))

export function showAIRestricted(message?: string) {
  useAIRestrictionStore.getState().show(message)
}
