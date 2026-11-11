import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion"
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/routes'
import { Logo } from "@/components/ui/Logo"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { FitToBox } from "@/components/ui/FitToBox"
import {
  Mail,
  MailOpen,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ShieldCheck,
  X,
} from "lucide-react"
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { BRAND } from '@/lib/brand'
import { type PandaEvent } from '@/components/LazyPanda'
import { AssistantPanel } from '@/components/LazyPanda/AssistantPanel'
import { AuthFooter } from '@/components/LazyPanda/AuthFooter'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// ── Minimalist Premium Glassmorphic & Atmospheric Background System ────────────

function LuxuryChromeBackground() {
  const reduced = usePrefersReducedMotion()
  const { isDark } = useTheme()

  // Delicate starlight / AI sparkle micro-nodes
  const sparkles = [
    { id: 1, x: '22%', y: '18%', size: 4, duration: 4.5, delay: 0 },
    { id: 2, x: '82%', y: '26%', size: 5, duration: 5.2, delay: 1.2 },
    { id: 3, x: '78%', y: '78%', size: 3.5, duration: 3.8, delay: 0.8 },
    { id: 4, x: '16%', y: '74%', size: 4, duration: 4.8, delay: 2.1 },
    { id: 5, x: '68%', y: '12%', size: 3, duration: 4.0, delay: 1.5 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* 1. Base Canvas Tuned to App Theme Tokens (--bg: #090D1A dark, #F4F6FB light) */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 100% 85% at 50% 20%, #0d1424 0%, #090D1A 55%, #050811 100%)'
            : 'radial-gradient(ellipse 100% 85% at 50% 20%, #FFFFFF 0%, #F4F6FB 55%, #E9EEF7 100%)',
        }}
      />

      {/* 2. Enterprise SaaS Tech Lattice Grid with Radial Feather Mask */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: isDark ? 0.35 : 0.45,
          backgroundImage: isDark
            ? 'radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px)'
            : 'radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, #000 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 45%, #000 20%, transparent 80%)',
        }}
      />

      {/* 3. Atmospheric Ambient Auroras (Exact Match with DashboardLayout System) */}
      {/* Top-center ambient violet / indigo glow */}
      <motion.div
        className="absolute -top-[25%] left-[20%] w-[55vw] h-[45vw] rounded-full blur-[130px] transition-opacity duration-700"
        animate={reduced ? undefined : {
          scale: [1, 1.05, 1],
          opacity: isDark ? [0.22, 0.28, 0.22] : [0.12, 0.16, 0.12],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(circle, #6366F1 0%, #4F46E5 40%, transparent 70%)',
          opacity: isDark ? 0.25 : 0.14,
        }}
      />

      {/* Top-right subtle cyan / sky accent */}
      <motion.div
        className="absolute -top-[15%] right-[5%] w-[42vw] h-[36vw] rounded-full blur-[110px] transition-opacity duration-700"
        animate={reduced ? undefined : {
          scale: [1, 1.04, 1],
          opacity: isDark ? [0.16, 0.22, 0.16] : [0.10, 0.14, 0.10],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          background: 'radial-gradient(circle, #06B6D4 0%, #3B82F6 45%, transparent 70%)',
          opacity: isDark ? 0.18 : 0.12,
        }}
      />

      {/* Bottom-left warm deep violet / rose reflection */}
      <motion.div
        className="absolute bottom-[2%] -left-[10%] w-[48vw] h-[42vw] rounded-full blur-[140px] transition-opacity duration-700"
        animate={reduced ? undefined : {
          scale: [1, 1.06, 1],
          opacity: isDark ? [0.12, 0.18, 0.12] : [0.08, 0.11, 0.08],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, #EC4899 35%, transparent 70%)',
          opacity: isDark ? 0.15 : 0.09,
        }}
      />

      {/* 4. Minimalist Precision Telemetry & Concentric Glass Orbital Rings (Top Right) */}
      <div className="absolute -top-32 -right-32 sm:-top-24 sm:-right-24 w-[480px] h-[480px] sm:w-[640px] sm:h-[640px] pointer-events-none">
        {/* Outer Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-indigo-500/15 dark:border-indigo-400/20"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
        {/* Middle Ring with Gradient Stroke Accent */}
        <motion.div
          className="absolute inset-12 sm:inset-16 rounded-full border border-slate-300/40 dark:border-white/10"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99,102,241,0.02) 0%, transparent 70%)',
          }}
          animate={reduced ? undefined : { rotate: -360 }}
          transition={{ duration: 75, repeat: Infinity, ease: "linear" }}
        >
          {/* Subtle micro orbital satellite node */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/60 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        </motion.div>
        {/* Inner Fine Ring */}
        <div className="absolute inset-28 sm:inset-36 rounded-full border border-indigo-500/10 dark:border-cyan-400/15" />
      </div>

      {/* 5. Minimalist Glass Concentric Halo (Bottom Left) */}
      <div className="absolute -bottom-40 -left-40 sm:-bottom-32 sm:-left-32 w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] pointer-events-none">
        {/* Outer Ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-indigo-500/10 dark:border-white/10"
          animate={reduced ? undefined : { rotate: -360 }}
          transition={{ duration: 110, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner Ring */}
        <motion.div
          className="absolute inset-14 sm:inset-20 rounded-full border border-purple-500/15 dark:border-purple-400/20"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 85, repeat: Infinity, ease: "linear" }}
        >
          {/* Micro node */}
          <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
        </motion.div>
      </div>

      {/* 6. Subtle Floating AI Sparkles / Starlight Glimmers */}
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: isDark ? '#ffffff' : '#6366F1',
            boxShadow: isDark
              ? '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(99, 102, 241, 0.5)'
              : '0 0 8px rgba(99, 102, 241, 0.6)',
          }}
          animate={reduced ? undefined : {
            scale: [0.8, 1.3, 0.8],
            opacity: isDark ? [0.3, 0.85, 0.3] : [0.25, 0.7, 0.25],
            y: [0, -8, 0],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ── Animated gradient border card wrapper ─────────────────────────────────────

function AnimatedBorderCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion()
  const { isDark } = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [-300, 300], [2.5, -2.5])
  const rotateY = useTransform(mouseX, [-300, 300], [-2.5, 2.5])

  const smoothRotateX = useSpring(rotateX, { damping: 25, stiffness: 120 })
  const smoothRotateY = useSpring(rotateY, { damping: 25, stiffness: 120 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={cardRef}
      className={cn("relative group", className)}
      onMouseMove={reduced ? undefined : handleMouseMove}
      onMouseLeave={reduced ? undefined : handleMouseLeave}
      style={{ perspective: '1000px' }}
    >
      {/* Outer soft ambient depth glow */}
      <div
        className="absolute -inset-2 rounded-[34px] pointer-events-none opacity-40 dark:opacity-50 blur-2xl transition-opacity duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.75) 0%, transparent 75%)'
            : 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, transparent 75%)',
        }}
      />

      {/* Card content with 3D tilt effect and frosted glass surface */}
      <motion.div
        className="relative rounded-[28px] overflow-hidden backdrop-blur-3xl transition-colors duration-300"
        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: 'preserve-3d',
          background: isDark
            ? 'color-mix(in srgb, var(--surface) 75%, transparent)'
            : 'rgba(255, 255, 255, 0.88)',
          border: '1px solid var(--glass-border)',
          boxShadow: isDark
            ? '0 30px 80px -15px rgba(0, 0, 0, 0.65), inset 0 1px 0 var(--glass-highlight)'
            : '0 20px 50px -10px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Specular top highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none z-20"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, var(--glass-highlight), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent)',
          }}
        />
        {children}
      </motion.div>
    </div>
  )
}


// ── Input Focus Ring Pulse (smooth glow effect on focus) ──────────────────────

function InputFocusRing({ inputRef, active, color = 'var(--accent)' }: { 
  inputRef: React.RefObject<HTMLInputElement | null>; 
  active: boolean;
  color?: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (active && inputRef.current) {
      setRect(inputRef.current.getBoundingClientRect())
    }
  }, [active, inputRef])

  if (!active || !rect) return null

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: rect.left - 4,
        top: rect.top - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        borderRadius: 20,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: [0, 0.6, 0],
        scale: [0.98, 1.02, 1.05],
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div 
        className="w-full h-full rounded-[20px]"
        style={{
          background: `linear-gradient(135deg, ${color}40, ${color}20)`,
          boxShadow: `0 0 20px ${color}30`,
        }}
      />
    </motion.div>
  )
}

// ── Creative Password Visibility Toggle (NEW) ─────────────────────────────────

function CreativePasswordToggle({
  showPassword,
  onToggle
}: {
  showPassword: boolean;
  onToggle: () => void
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Add ripple effect
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { id, x, y }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)

    onToggle()
  }

  return (
    <motion.button
      type="button"
      tabIndex={-1}
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 cursor-pointer group"
      aria-label={showPassword ? "Hide password" : "Show password"}
      style={{ perspective: '1000px' }}
    >
      {/* Animated gradient border container */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          rotate: showPassword ? 0 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: isHovered
              ? showPassword
                ? '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)'
                : '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)'
              : '0 0 0px rgba(139, 92, 246, 0)',
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Gradient border */}
        <motion.div
          className="absolute -inset-[2px] rounded-xl opacity-0 group-hover:opacity-100"
          style={{
            background: showPassword
              ? 'linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc)'
              : 'linear-gradient(135deg, #3b82f6, #60a5fa, #93c5fd)',
          }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Main button container */}
        <motion.div
          className="relative px-2.5 py-2.5 rounded-xl bg-surface overflow-hidden"
          animate={{
            backgroundColor: isHovered
              ? showPassword
                ? 'rgba(139, 92, 246, 0.1)'
                : 'rgba(59, 130, 246, 0.1)'
              : 'rgba(255, 255, 255, 0.05)',
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Ripple effects */}
          <AnimatePresence>
            {ripples.map((ripple) => (
              <motion.div
                key={ripple.id}
                className="absolute rounded-full"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  background: showPassword
                    ? 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, transparent 70%)',
                }}
                initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  width: 80,
                  height: 80,
                  x: -40,
                  y: -40,
                  opacity: 0
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>

          {/* Icon container with morphing animation */}
          <div className="relative w-5 h-5">
            <AnimatePresence mode="wait">
              {showPassword ? (
                <motion.div
                  key="eye-off"
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    animate={{
                      color: isHovered ? '#8b5cf6' : '#9ca3af',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <EyeOff className="w-5 h-5" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="eye-on"
                  initial={{ rotateY: -90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: 90, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <motion.div
                    animate={{
                      color: isHovered ? '#3b82f6' : '#9ca3af',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Eye className="w-5 h-5" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scanning line effect when showing password */}
          <AnimatePresence>
            {showPassword && isHovered && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute h-[2px] w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                  style={{ left: 0 }}
                  animate={{
                    top: ['0%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Orbiting particles */}
      <AnimatePresence>
        {isHovered && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: showPassword ? '#8b5cf6' : '#3b82f6',
                  left: '50%',
                  top: '50%',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, Math.cos((i * 120 * Math.PI) / 180) * 25],
                  y: [0, Math.sin((i * 120 * Math.PI) / 180) * 25],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Stagger container & item variants ─────────────────────────────────────────

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 }
  }
}

const staggerItem = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }
}

// ── Error mapper ──────────────────────────────────────────────────────────────

const mapAuthError = (message: string): { field: 'email' | 'password' | 'general'; text: string } => {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('invalid_credentials'))
    return { field: 'general', text: 'Incorrect email or password.' }
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed') || m.includes('email not verified'))
    return { field: 'email', text: 'Please verify your email before signing in.' }
  if (m.includes('user not found') || m.includes('no user found'))
    return { field: 'email', text: 'No account found with this email.' }
  if (m.includes('password') && m.includes('weak'))
    return { field: 'password', text: 'Password is too weak. Use at least 8 characters.' }
  if (m.includes('already registered') || m.includes('already exists') || m.includes('email_exists'))
    return { field: 'email', text: 'An account with this email already exists.' }
  if (m.includes('too many requests') || m.includes('rate limit'))
    return { field: 'general', text: 'Too many attempts. Please wait a moment and try again.' }
  if (m.includes('network') || m.includes('fetch'))
    return { field: 'general', text: 'Network error. Check your connection and try again.' }
  if (m.includes('email_address_invalid') || m.includes('invalid email address') || m.includes('email address is invalid') || m.includes('domain not allowed'))
    return { field: 'email', text: 'Only @duvips.com email addresses are allowed.' }

  return { field: 'general', text: message || 'Something went wrong. Please try again.' }
}

// ── Main AuthPage component ───────────────────────────────────────────────────

export const AuthPage = () => {
  const { toast } = useToast()
  const { theme, isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isLogin = location.pathname !== ROUTES.signup
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string; general?: string }>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [focusTrigger, setFocusTrigger] = useState(0)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  // Lazy Panda integration
  const pandaSendRef = useRef<((event: PandaEvent) => void) | null>(null)
  const pandaReady = useCallback((send: (event: PandaEvent) => void) => { pandaSendRef.current = send }, [])
  const pandaSend = (event: PandaEvent) => pandaSendRef.current?.(event)

  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null)

  // Keep /login inside the viewport — zoom must scale, never scroll
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.height = '100%'
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.height = prev.htmlHeight
      body.style.height = prev.bodyHeight
    }
  }, [])

  const clearErrors = () => setFieldError({})

  const triggerFocusEffect = () => {
    setFocusTrigger(prev => prev + 1)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!email.trim()) return setFieldError({ email: 'Please enter your email address.' })
    if (!password) return setFieldError({ password: 'Please enter your password.' })
    if (!isLogin && password.length < 8) return setFieldError({ password: 'Password must be at least 8 characters.' })

    setIsLoading(true)
    pandaSend({ type: 'LOGIN_START' })
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .single()

          if (!profileError && profile && profile.status === 'inactive') {
            await supabase.auth.signOut()
            throw new Error('Your account has been disabled. Please contact support.')
          }
        }

        pandaSend({ type: 'LOGIN_SUCCESS' })
        toast({ variant: 'success', title: '✓ Welcome back', description: 'Authenticated successfully.' })
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user && data.session) {
          await supabase.from('profiles').upsert({ id: data.user.id, email }, { onConflict: 'id' })
          pandaSend({ type: 'LOGIN_SUCCESS' })
          toast({ variant: 'success', title: '✓ Account created', description: 'Welcome! You are now logged in.' })
        } else {
          pandaSend({ type: 'LOGIN_SUCCESS' })
          setSignupSuccessEmail(email)
          toast({ title: 'Verify your email', description: 'Check your inbox to confirm your account.' })
        }
      }
    } catch (error: unknown) {
      console.error('[AuthPage] Authentication failed:', error)
      pandaSend({ type: 'LOGIN_ERROR' })
      const mapped = mapAuthError(error instanceof Error ? error.message : String(error) ?? '')
      setFieldError({ [mapped.field]: mapped.text })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    clearErrors()
    if (!email.trim()) {
      setFieldError({ email: 'Please enter your email address first to reset password.' })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      })
      if (error) throw error
      toast({ title: 'Reset email sent', description: 'Check your email inbox for a password reset link.' })
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  if (signupSuccessEmail) {
    return (
      <div className="h-dvh max-h-dvh bg-background relative overflow-hidden">
        {/* Cinematic Vignette Background */}
        <LuxuryChromeBackground />

        <div className="absolute inset-0 z-10">
        <FitToBox className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-[min(480px,92vw)]"
        >
          <AnimatedBorderCard>
            <div className="p-8 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-accent-gold/10 border border-accent-gold/20 rounded-full flex items-center justify-center mx-auto text-accent-gold">
                <MailOpen className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-clash font-bold text-text-primary tracking-tight">Confirm Your Email</h2>
                <p className="text-sm text-text-secondary font-montreal">
                  Check your inbox for a verification email
                </p>
              </div>
              <p className="text-xs text-text-muted font-montreal leading-relaxed">
                We have sent a verification link to <strong className="text-text-primary">{signupSuccessEmail}</strong>.
                Please click the link in the email to activate your account and start using Qub.ai.
              </p>
              <div className="pt-4">
                <FloatingButton
                  onClick={() => {
                    setSignupSuccessEmail(null)
                    navigate(ROUTES.login, { replace: true })
                  }}
                  className="w-full py-4 rounded-2xl text-xs uppercase tracking-widest font-bold"
                >
                  Back to Sign In
                </FloatingButton>
              </div>
            </div>
          </AnimatedBorderCard>
        </motion.div>
        </FitToBox>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh max-h-dvh bg-background relative overflow-hidden">
      {/* Cinematic Vignette Background */}
      <LuxuryChromeBackground />

      {/* Smooth focus ring effects */}
      <AnimatePresence>
        {focusedField === 'email' && (
          <InputFocusRing key={`email-${focusTrigger}`} inputRef={emailInputRef} active={true} color="var(--accent)" />
        )}
        {focusedField === 'password' && (
          <InputFocusRing key={`password-${focusTrigger}`} inputRef={passwordInputRef} active={true} color="var(--accent)" />
        )}
      </AnimatePresence>

      {/* 2-Column Layout: Assistant Panel (left half) + Auth Card (right half) */}
      <div className="relative z-10 h-full grid grid-cols-1 lg:grid-cols-2">

        {/* Left: Lazy Panda Assistant Panel (hidden on mobile, completely protected) */}
        <AssistantPanel isSignUp={!isLogin} onPandaReady={pandaReady} />

        {/* Right: Authentication Card — scales to stay fully on-screen */}
        <div className="h-full min-h-0">
          <FitToBox className="px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="w-[min(480px,92vw)]"
          >
            {/* Card with animated gradient border & reference image glass styling */}
            <AnimatedBorderCard>
              <div className="min-h-[36rem] sm:min-h-[38rem] px-6 py-8 sm:px-9 sm:py-9 flex flex-col">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col flex-1 justify-between"
                >
                  {/* Top Bar inside Card: Brand Identity + Close X */}
                  <motion.div variants={staggerItem} className="flex items-center justify-between mb-5">
                    <div className="flex items-center">
                      <Logo size="md" animate={false} subtitle="Enterprise Platform" />
                    </div>

                    {/* Close 'X' Button returning to landing page */}
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.landing)}
                      aria-label="Return to landing page"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-90 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>

                  {/* Sign In / Join Tabs Row */}
                  <motion.div variants={staggerItem} className="flex items-center gap-7 pb-2 border-b border-black/[0.06] dark:border-white/10 mb-6">
                    {/* Sign In Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLogin) {
                          navigate(ROUTES.login, { replace: true })
                          clearErrors()
                        }
                      }}
                      className="relative pb-2 cursor-pointer group"
                    >
                      <span className={cn(
                        "text-2xl sm:text-3xl font-clash font-bold tracking-tight transition-colors duration-200",
                        isLogin ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
                      )}>
                        Sign In
                      </span>
                      {isLogin && (
                        <motion.div
                          layoutId="auth-active-tab-glow"
                          className="absolute bottom-0 left-0 w-11 h-1 rounded-full bg-gradient-to-r from-accent via-indigo-400 to-accent-hover shadow-[0_0_14px_rgba(99,102,241,0.7)]"
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                    </button>

                    {/* Join Tab */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isLogin) {
                          navigate(ROUTES.signup, { replace: true })
                          clearErrors()
                        }
                      }}
                      className="relative pb-2 cursor-pointer group"
                    >
                      <span className={cn(
                        "text-2xl sm:text-3xl font-clash font-bold tracking-tight transition-colors duration-200",
                        !isLogin ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
                      )}>
                        Join
                      </span>
                      {!isLogin && (
                        <motion.div
                          layoutId="auth-active-tab-glow"
                          className="absolute bottom-0 left-0 w-11 h-1 rounded-full bg-gradient-to-r from-accent via-indigo-400 to-accent-hover shadow-[0_0_14px_rgba(99,102,241,0.7)]"
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                    </button>
                  </motion.div>

                  {/* Form */}
                  <form onSubmit={handleAuth} className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* General error banner */}
                    <AnimatePresence>
                      {fieldError.general && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-montreal"
                        >
                          <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                          {fieldError.general}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div variants={staggerItem} className="space-y-4">
                      {/* Email Input */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted pl-1 font-montreal">
                          Email
                        </label>
                        <motion.div
                          className="relative group"
                          whileTap={{ scale: 0.998 }}
                          animate={{
                            y: focusedField === 'email' ? -2 : 0,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          {/* Animated subtle glow border */}
                          <motion.div
                            className="absolute -inset-[1.5px] rounded-2xl pointer-events-none"
                            style={{
                              background: fieldError.email
                                ? 'linear-gradient(135deg, #ef4444, #f87171, #ef4444)'
                                : 'linear-gradient(135deg, var(--accent), #818cf8, #a5b4fc, var(--accent))',
                              backgroundSize: '200% 200%',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: focusedField === 'email' ? 0.9 : 0,
                            }}
                            transition={{ opacity: { duration: 0.25 } }}
                          />

                          <input
                            ref={emailInputRef}
                            type="email"
                            placeholder="hey@vino.costa"
                            value={email}
                            tabIndex={1}
                            autoComplete="email"
                            onFocus={() => {
                              setFocusedField('email');
                              triggerFocusEffect();
                              pandaSend({ type: 'EMAIL_FOCUS' });
                            }}
                            onBlur={() => { setFocusedField(null); pandaSend({ type: 'EMAIL_BLUR' }) }}
                            onChange={(e) => { setEmail(e.target.value); pandaSend({ type: 'EMAIL_TYPING' }); if (fieldError.email) clearErrors() }}
                            className={cn(
                              "relative w-full h-[50px] px-4 rounded-2xl text-sm text-text-primary placeholder:text-text-muted/70 focus:outline-none backdrop-blur-xl transition-all duration-200",
                              "bg-black/[0.04] dark:bg-white/[0.05] border",
                              fieldError.email
                                ? "border-red-500/60 focus:border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
                                : focusedField === 'email'
                                  ? "border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.18),0_0_20px_rgba(99,102,241,0.15)] bg-white dark:bg-white/[0.08]"
                                  : "border-black/[0.08] dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                            )}
                          />
                        </motion.div>
                        <AnimatePresence>
                          {fieldError.email && (
                            <motion.p
                              initial={{ opacity: 0, y: -4, x: -10 }}
                              animate={{ opacity: 1, y: 0, x: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="text-xs text-red-400 font-montreal pl-1"
                            >
                              {fieldError.email}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Password Input */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted pl-1 font-montreal">
                          Password
                        </label>
                        <motion.div
                          className="relative group"
                          whileTap={{ scale: 0.998 }}
                          animate={{
                            y: focusedField === 'password' ? -2 : 0,
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          {/* Animated subtle glow border */}
                          <motion.div
                            className="absolute -inset-[1.5px] rounded-2xl pointer-events-none"
                            style={{
                              background: fieldError.password
                                ? 'linear-gradient(135deg, #ef4444, #f87171, #ef4444)'
                                : 'linear-gradient(135deg, var(--accent), #818cf8, #a5b4fc, var(--accent))',
                              backgroundSize: '200% 200%',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: focusedField === 'password' ? 0.9 : 0,
                            }}
                            transition={{ opacity: { duration: 0.25 } }}
                          />

                          <input
                            ref={passwordInputRef}
                            type={showPassword ? "text" : "password"}
                            placeholder="At least 12 symbols..."
                            value={password}
                            tabIndex={2}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            onFocus={() => {
                              setFocusedField('password');
                              triggerFocusEffect();
                              pandaSend({ type: 'PASSWORD_FOCUS' });
                            }}
                            onBlur={() => { setFocusedField(null); pandaSend({ type: 'PASSWORD_BLUR' }) }}
                            onChange={(e) => { setPassword(e.target.value); if (fieldError.password) clearErrors() }}
                            className={cn(
                              "relative w-full h-[50px] pl-4 pr-12 rounded-2xl text-sm text-text-primary placeholder:text-text-muted/70 focus:outline-none backdrop-blur-xl transition-all duration-200",
                              "bg-black/[0.04] dark:bg-white/[0.05] border",
                              fieldError.password
                                ? "border-red-500/60 focus:border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
                                : focusedField === 'password'
                                  ? "border-accent shadow-[0_0_0_3px_rgba(99,102,241,0.18),0_0_20px_rgba(99,102,241,0.15)] bg-white dark:bg-white/[0.08]"
                                  : "border-black/[0.08] dark:border-white/10 hover:border-black/20 dark:hover:border-white/20"
                            )}
                          />

                          {/* Minimalist eye visibility toggle matching reference image */}
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => {
                              const next = !showPassword
                              setShowPassword(next)
                              pandaSend({ type: 'PASSWORD_SHOW_TOGGLE', visible: next })
                            }}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted/70 hover:text-text-primary transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </motion.div>
                        <AnimatePresence>
                          {fieldError.password && (
                            <motion.p
                              initial={{ opacity: 0, y: -4, x: -10 }}
                              animate={{ opacity: 1, y: 0, x: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="text-xs text-red-400 font-montreal pl-1"
                            >
                              {fieldError.password}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {isLogin && (
                      <motion.div variants={staggerItem} className="flex items-center justify-between px-1 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            tabIndex={3}
                            className="w-4 h-4 rounded border-border bg-black/[0.04] dark:bg-white/5 text-accent focus:ring-accent/20 cursor-pointer"
                          />
                          <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors font-montreal">Remember me</span>
                        </label>
                        <motion.button
                          onClick={handleForgotPassword}
                          type="button"
                          tabIndex={4}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="text-xs text-accent/80 hover:text-accent transition-colors font-montreal font-medium"
                        >
                          Forgot password?
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Submit Action Button */}
                    <motion.div variants={staggerItem} className="pt-2">
                      <button
                        type="submit"
                        tabIndex={5}
                        disabled={isLoading}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-accent via-indigo-500 to-accent text-white font-montreal font-semibold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Authenticating...</span>
                          </div>
                        ) : (
                          <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        )}
                      </button>
                    </motion.div>
                  </form>

                  {/* 4 Frosted Glass Social / Partner Pills Matching Reference Image */}
                  <motion.div variants={staggerItem} className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
                    <div className="grid grid-cols-4 gap-2.5">
                      {/* Google */}
                      <button
                        type="button"
                        onClick={() => toast({ title: 'Google Sign In', description: 'Google authentication will connect with your workspace account.' })}
                        className="h-11 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:scale-[1.04] active:scale-[0.96] backdrop-blur-md cursor-pointer group shadow-sm"
                        aria-label="Sign in with Google"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                      </button>

                      {/* Apple */}
                      <button
                        type="button"
                        onClick={() => toast({ title: 'Apple Sign In', description: 'Apple authentication will connect with your Apple ID.' })}
                        className="h-11 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:scale-[1.04] active:scale-[0.96] backdrop-blur-md cursor-pointer group shadow-sm text-text-primary"
                        aria-label="Sign in with Apple"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.47c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.11.64-2.77 1.42-.58.68-1.09 1.74-1.04 2.81 1.08.08 2.19-.57 2.8-1.36z"/>
                        </svg>
                      </button>

                      {/* X / Twitter */}
                      <button
                        type="button"
                        onClick={() => toast({ title: 'X Sign In', description: 'X authentication will connect with your X account.' })}
                        className="h-11 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all hover:scale-[1.04] active:scale-[0.96] backdrop-blur-md cursor-pointer group shadow-sm text-text-primary"
                        aria-label="Sign in with X"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </button>

                      {/* Discord */}
                      <button
                        type="button"
                        onClick={() => toast({ title: 'Discord Sign In', description: 'Discord authentication will connect with your Discord account.' })}
                        className="h-11 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 dark:bg-[#5865F2]/15 dark:hover:bg-[#5865F2]/25 border border-[#5865F2]/20 dark:border-[#5865F2]/30 flex items-center justify-center transition-all hover:scale-[1.04] active:scale-[0.96] backdrop-blur-md cursor-pointer group shadow-sm text-[#5865F2] dark:text-[#7983F5]"
                        aria-label="Sign in with Discord"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </AnimatedBorderCard>

            {/* Premium Auth Footer */}
            <AuthFooter />
          </motion.div>
          </FitToBox>
        </div>

      </div>
    </div>
  )
}
