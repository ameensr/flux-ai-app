import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import { Logo } from "@/components/ui/Logo"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Box,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import { cn } from '@/lib/utils'
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { BRAND } from '@/lib/brand'

// ── Animated floating orbs background ─────────────────────────────────────────

function FloatingOrbs() {
  const orbs = [
    { size: 300, x: '10%', y: '20%', duration: 20, delay: 0, color: 'var(--accent)' },
    { size: 200, x: '80%', y: '10%', duration: 25, delay: 2, color: '#3b82f6' },
    { size: 250, x: '70%', y: '70%', duration: 22, delay: 4, color: 'var(--accent)' },
    { size: 180, x: '20%', y: '80%', duration: 18, delay: 1, color: '#a855f7' },
    { size: 120, x: '50%', y: '50%', duration: 30, delay: 3, color: '#10b981' },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color}20 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
            opacity: [0.3, 0.6, 0.4, 0.5, 0.3],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ── Animated grid lines ───────────────────────────────────────────────────────

function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, var(--accent) 1px, transparent 1px),
            linear-gradient(0deg, var(--accent) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        animate={{
          backgroundPosition: ['0px 0px', '60px 60px']
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  )
}

// ── Sparkle particles ─────────────────────────────────────────────────────────

function SparkleParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 5,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-accent"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
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
  return (
    <div className={cn("relative group", className)}>
      {/* Rotating gradient border */}
      <motion.div
        className="absolute -inset-[1px] rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'conic-gradient(from 0deg, var(--accent), #3b82f6, #a855f7, #10b981, var(--accent))',
          filter: 'blur(1px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      {/* Outer glow on hover */}
      <motion.div
        className="absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700"
        style={{
          background: 'conic-gradient(from 0deg, var(--accent), #3b82f6, #a855f7, transparent)',
          filter: 'blur(20px)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      {/* Card content */}
      <div className="relative bg-surface rounded-3xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── Morphing text animation ───────────────────────────────────────────────────

function MorphingHeading({ isLogin }: { isLogin: boolean }) {
  const words = isLogin
    ? ['Welcome back', 'Good to see you', 'Ready to build']
    : [`Join ${BRAND.shortName}`, 'Start creating', 'Level up QA']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [words.length])

  return (
    <div className="h-10 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.h1
          key={`${isLogin}-${index}`}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl font-clash font-bold text-text-primary absolute inset-0 flex items-center justify-center"
        >
          {words[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
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
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return { field: 'general', text: 'Incorrect email or password.' }
  if (m.includes('email not confirmed'))
    return { field: 'email', text: 'Please verify your email before signing in.' }
  if (m.includes('user not found') || m.includes('no user found'))
    return { field: 'email', text: 'No account found with this email.' }
  if (m.includes('password') && m.includes('weak'))
    return { field: 'password', text: 'Password is too weak. Use at least 8 characters.' }
  if (m.includes('already registered') || m.includes('already exists'))
    return { field: 'email', text: 'An account with this email already exists.' }
  if (m.includes('too many requests') || m.includes('rate limit'))
    return { field: 'general', text: 'Too many attempts. Please wait a moment and try again.' }
  if (m.includes('network') || m.includes('fetch'))
    return { field: 'general', text: 'Network error. Check your connection and try again.' }
  return { field: 'general', text: 'Something went wrong. Please try again.' }
}

// ── Main AuthPage component ───────────────────────────────────────────────────

export const AuthPage = () => {
  const { setShowLanding } = useAppStore()
  const { toast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string; general?: string }>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const clearErrors = () => setFieldError({})

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!email.trim()) return setFieldError({ email: 'Please enter your email address.' })
    if (!password) return setFieldError({ password: 'Please enter your password.' })
    if (!isLogin && password.length < 8) return setFieldError({ password: 'Password must be at least 8 characters.' })

    setIsLoading(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast({ title: 'Welcome back', description: 'Authenticated successfully.' })
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user && data.session) {
          await supabase.from('profiles').upsert({ id: data.user.id, email }, { onConflict: 'id' })
          toast({ title: 'Account created', description: 'Welcome! You are now logged in.' })
        } else {
          toast({ title: 'Verify your email', description: 'Check your inbox to confirm your account.' })
        }
      }
    } catch (error: any) {
      const mapped = mapAuthError(error?.message ?? '')
      setFieldError({ [mapped.field]: mapped.text })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuth = async (provider: 'github' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (error: any) {
      toast({ variant: "destructive", title: "OAuth Error", description: error.message })
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
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
      {/* Animated Background Layers */}
      <FloatingOrbs />
      <AnimatedGrid />
      <SparkleParticles />

      {/* Main card entrance animation */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[480px] z-10"
      >
        {/* Back to Landing Link */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-12 text-xs font-bold uppercase tracking-widest group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Terminal
        </motion.button>

        {/* Card with animated gradient border */}
        <AnimatedBorderCard>
          <div className="p-6 sm:p-10">
            {/* Staggered form content */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Header */}
              <motion.div variants={staggerItem} className="flex flex-col items-center text-center mb-10">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Logo size="lg" className="mb-8" />
                </motion.div>

                <MorphingHeading isLogin={isLogin} />

                <motion.p
                  className="text-text-secondary text-sm font-montreal leading-relaxed mt-3"
                  variants={staggerItem}
                >
                  {isLogin
                    ? BRAND.tagline
                    : 'Start your journey into high-fidelity QA intelligence.'}
                </motion.p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-6">
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
                    <motion.div
                      className="relative group"
                      whileTap={{ scale: 0.995 }}
                    >
                      {/* Focus glow effect */}
                      <AnimatePresence>
                        {focusedField === 'email' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute -inset-1 rounded-2xl bg-accent/10 blur-md"
                          />
                        )}
                      </AnimatePresence>
                      <div className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
                        fieldError.email ? "text-red-400" : focusedField === 'email' ? "text-accent scale-110" : "text-text-muted"
                      )}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => { setEmail(e.target.value); if (fieldError.email) clearErrors() }}
                        className={cn(
                          "relative w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all duration-300",
                          fieldError.email
                            ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                            : "border-border focus:border-accent/50 focus:ring-accent/10"
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
                    <motion.div
                      className="relative group"
                      whileTap={{ scale: 0.995 }}
                    >
                      <AnimatePresence>
                        {focusedField === 'password' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute -inset-1 rounded-2xl bg-accent/10 blur-md"
                          />
                        )}
                      </AnimatePresence>
                      <div className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10",
                        fieldError.password ? "text-red-400" : focusedField === 'password' ? "text-accent scale-110" : "text-text-muted"
                      )}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => { setPassword(e.target.value); if (fieldError.password) clearErrors() }}
                        className={cn(
                          "relative w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all duration-300",
                          fieldError.password
                            ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                            : "border-border focus:border-accent/50 focus:ring-accent/10"
                        )}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors z-10"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
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
                  <motion.div variants={staggerItem} className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" className="w-4 h-4 rounded border-border bg-white/5 text-accent focus:ring-accent/20" />
                      <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors font-montreal">Remember me</span>
                    </label>
                    <motion.button
                      onClick={handleForgotPassword}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-xs text-accent/80 hover:text-accent transition-colors font-bold uppercase tracking-widest"
                    >
                      Forgot?
                    </motion.button>
                  </motion.div>
                )}

                <motion.div variants={staggerItem}>
                  <FloatingButton
                    type="submit"
                    className="w-full py-4 rounded-2xl text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Authenticating...</span>
                      </div>
                    ) : (
                      <motion.div
                        className="flex items-center gap-2"
                        whileHover={{ x: 3 }}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isLogin ? 'Continue' : 'Create Account'}</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </motion.div>
                      </motion.div>
                    )}
                  </FloatingButton>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div variants={staggerItem} className="relative my-10">
                <div className="w-full border-t border-border" />
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-surface text-text-muted text-[10px] uppercase tracking-widest">
                  or continue with
                </div>
              </motion.div>

              {/* OAuth Buttons */}
              <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4">
                <motion.button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/5 border border-border hover:border-accent/30 hover:bg-white/10 transition-all text-xs font-bold text-text-primary group"
                >
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                    <User className="w-4 h-4" />
                  </motion.div>
                  GitHub
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white/5 border border-border hover:border-accent/30 hover:bg-white/10 transition-all text-xs font-bold text-text-primary group"
                >
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                    <Box className="w-4 h-4" />
                  </motion.div>
                  Google
                </motion.button>
              </motion.div>

              {/* Footer Toggle */}
              <motion.div variants={staggerItem} className="mt-10 text-center">
                <motion.button
                  onClick={() => { setIsLogin(!isLogin); clearErrors() }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="text-xs text-text-muted hover:text-text-primary transition-colors font-montreal"
                >
                  {isLogin ? (
                    <>Don't have an account? <span className="text-accent font-bold">Sign Up</span></>
                  ) : (
                    <>Already a member? <span className="text-accent font-bold">Sign In</span></>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </AnimatedBorderCard>

        {/* Security Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40"
        >
          <motion.div
            className="flex items-center gap-2"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ShieldCheck className="w-3 h-3" /> SOC2 COMPLIANT
          </motion.div>
          <div className="h-4 w-px bg-border" />
          <motion.div
            className="flex items-center gap-2"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          >
            AES-256 ENCRYPTED
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
