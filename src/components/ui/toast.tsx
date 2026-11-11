import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 right-0 sm:top-6 sm:right-6 z-[100] flex max-h-screen w-full flex-col p-4 sm:p-0 pointer-events-none sm:max-w-[400px] gap-3",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3.5 overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-3xl transition-all duration-300 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-top-6",
  {
    variants: {
      variant: {
        default:
          "border-indigo-500/20 dark:border-indigo-400/25 bg-white/90 dark:bg-slate-900/85 text-slate-900 dark:text-slate-100 shadow-[0_16px_36px_-8px_rgba(99,102,241,0.14),0_0_25px_rgba(99,102,241,0.12)]",
        destructive:
          "destructive group border-rose-500/30 dark:border-rose-400/30 bg-white/92 dark:bg-[#200a10]/90 text-rose-950 dark:text-rose-100 shadow-[0_16px_36px_-8px_rgba(244,63,94,0.16),0_0_25px_rgba(244,63,94,0.15)]",
        success:
          "group border-emerald-500/30 dark:border-emerald-400/30 bg-white/92 dark:bg-[#062016]/90 text-emerald-950 dark:text-emerald-100 shadow-[0_16px_36px_-8px_rgba(16,185,129,0.16),0_0_25px_rgba(16,185,129,0.15)]",
        warning:
          "group border-amber-500/30 dark:border-amber-400/30 bg-white/92 dark:bg-[#241604]/90 text-amber-950 dark:text-amber-100 shadow-[0_16px_36px_-8px_rgba(245,158,11,0.16),0_0_25px_rgba(245,158,11,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {/* Specular Top Rim Reflection Line */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none z-10"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
        }}
      />
      {children}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 dark:bg-white/5 px-3 text-xs font-semibold backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-400 dark:text-slate-500 opacity-60 transition-all hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white active:scale-90 focus:opacity-100 focus:outline-none cursor-pointer",
      className
    )}
    toast-close=""
    aria-label="Close notification"
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[13px] font-semibold tracking-tight leading-snug font-clash text-slate-900 dark:text-white", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs leading-relaxed font-montreal text-slate-600 dark:text-slate-300/85 mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
