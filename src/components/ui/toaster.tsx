import React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles } from "lucide-react"

function getToastIcon(variant?: string | null, title?: React.ReactNode) {
  const titleStr = typeof title === 'string' ? title.toLowerCase() : ''

  if (
    variant === 'success' ||
    titleStr.includes('✓') ||
    titleStr.includes('success') ||
    titleStr.includes('created') ||
    titleStr.includes('saved') ||
    titleStr.includes('loaded') ||
    titleStr.includes('connected')
  ) {
    return (
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.25)] mt-0.5">
        <CheckCircle2 className="w-4 h-4" />
      </div>
    )
  }

  if (variant === 'destructive' || titleStr.includes('error') || titleStr.includes('failed') || titleStr.includes('denied')) {
    return (
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.25)] mt-0.5">
        <AlertCircle className="w-4 h-4" />
      </div>
    )
  }

  if (variant === 'warning' || titleStr.includes('warning') || titleStr.includes('attention')) {
    return (
      <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.25)] mt-0.5">
        <AlertTriangle className="w-4 h-4" />
      </div>
    )
  }

  // Default / Info (e.g. "Report Loaded", "Google Sign In", info notifications)
  return (
    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.25)] mt-0.5">
      <Sparkles className="w-4 h-4" />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant = 'default', ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            {getToastIcon(variant, title)}
            <div className="flex-1 grid gap-0.5 min-w-0 pr-4">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
