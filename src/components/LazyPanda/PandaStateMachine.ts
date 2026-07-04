// src/components/LazyPanda/PandaStateMachine.ts
// Finite state machine for the Lazy Panda mascot.

import type { PandaState, PandaEvent, PandaContext } from './types'

export function createInitialContext(isSignUp = false): PandaContext {
  return {
    state: 'IDLE',
    prevState: 'IDLE',
    eyeTarget: { x: 0, y: 0 },
    isPasswordVisible: false,
    idleSeconds: 0,
    blinkTimer: 0,
    isSignUp,
  }
}

/**
 * Pure state transition function.
 * Returns the next state given the current state and an event.
 */
export function transition(ctx: PandaContext, event: PandaEvent): PandaContext {
  const prev = ctx.state

  switch (event.type) {
    case 'EMAIL_FOCUS':
      return { ...ctx, state: 'LOOKING_AT_EMAIL', prevState: prev, idleSeconds: 0 }

    case 'EMAIL_TYPING':
      return { ...ctx, state: 'LOOKING_AT_EMAIL', prevState: prev, idleSeconds: 0 }

    case 'EMAIL_BLUR':
      if (ctx.state === 'LOOKING_AT_EMAIL') {
        return { ...ctx, state: 'IDLE', prevState: prev, idleSeconds: 0 }
      }
      return ctx

    case 'PASSWORD_FOCUS':
      return { ...ctx, state: 'PASSWORD_HIDE', prevState: prev, isPasswordVisible: false, idleSeconds: 0 }

    case 'PASSWORD_BLUR':
      if (ctx.state === 'PASSWORD_HIDE' || ctx.state === 'PASSWORD_SHOW') {
        return { ...ctx, state: 'IDLE', prevState: prev, isPasswordVisible: false, idleSeconds: 0 }
      }
      return ctx

    case 'PASSWORD_SHOW_TOGGLE':
      if (ctx.state === 'PASSWORD_HIDE' || ctx.state === 'PASSWORD_SHOW') {
        return {
          ...ctx,
          state: event.visible ? 'PASSWORD_SHOW' : 'PASSWORD_HIDE',
          prevState: prev,
          isPasswordVisible: event.visible,
          idleSeconds: 0,
        }
      }
      return ctx

    case 'LOGIN_START':
      return { ...ctx, state: 'LOGIN_LOADING', prevState: prev, idleSeconds: 0 }

    case 'LOGIN_SUCCESS':
      return { ...ctx, state: 'SUCCESS', prevState: prev, idleSeconds: 0 }

    case 'LOGIN_ERROR':
      return { ...ctx, state: 'ERROR', prevState: prev, idleSeconds: 0 }

    case 'IDLE_TIMEOUT':
      if (ctx.state === 'IDLE' || ctx.state === 'WALKING') {
        return { ...ctx, state: 'SLEEPING', prevState: prev }
      }
      return ctx

    case 'WAKE_UP':
      if (ctx.state === 'SLEEPING') {
        return { ...ctx, state: 'IDLE', prevState: prev, idleSeconds: 0 }
      }
      return ctx

    case 'RESET':
      return { ...ctx, state: 'IDLE', prevState: prev, idleSeconds: 0, isPasswordVisible: false }

    default:
      return ctx
  }
}
