import React, { useState } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import { Logo } from "@/components/ui/Logo"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { AmbientGlow } from "@/components/ui/AmbientGlow"
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Box, 
  ArrowRight,
  ChevronLeft,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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

export const AuthPage = () => {
  const { setUser, setShowLanding, setProfile } = useAppStore()
  const { toast } = useToast()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string; general?: string }>({})

  const clearErrors = () => setFieldError({})

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Client-side validation
    if (!email.trim()) return setFieldError({ email: 'Please enter your email address.' })
    if (!password) return setFieldError({ password: 'Please enter your password.' })
    if (!isLogin && password.length < 8) return setFieldError({ password: 'Password must be at least 8 characters.' })

    setIsLoading(true)
    try {
      const fetchAndSetProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (data) setProfile(data)
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await fetchAndSetProfile(data.user.id)
        setUser(data.user)
        setShowLanding(false)
        toast({ title: 'Welcome back', description: 'Authenticated successfully.' })
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user && data.session) {
          // Upsert profile for new users so fetchAndSetProfile always finds a row
          await supabase.from('profiles').upsert({ id: data.user.id, email }, { onConflict: 'id' })
          await fetchAndSetProfile(data.user.id)
          setUser(data.user)
          setShowLanding(false)
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
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "OAuth Error",
        description: error.message,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-6 py-20">
      {/* Cinematic Background */}
      <AmbientGlow size="xl" color="accent-gold" className="top-[-20%] left-[-10%] opacity-[0.08]" />
      <AmbientGlow size="lg" color="white" className="bottom-[-10%] right-[-10%] opacity-[0.03]" />
      
      {/* Background Neural Grid (Subtle) */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[480px] z-10"
      >
        {/* Back to Landing Link */}
        <button 
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-12 text-xs font-bold uppercase tracking-widest group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Terminal
        </button>

        <GlassCard hoverEffect={false} className="p-10 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <Logo size="lg" className="mb-8" />
            <motion.h1 
              key={isLogin ? 'login-h' : 'signup-h'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-clash font-bold text-white mb-3"
            >
              {isLogin ? 'Welcome back' : 'Join the IQ'}
            </motion.h1>
            <p className="text-text-secondary text-sm font-montreal leading-relaxed">
              {isLogin 
                ? 'Enter your credentials to access the command center.' 
                : 'Start your journey into high-fidelity QA intelligence.'}
              <span className="sr-only">v1.1</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            {/* General error banner */}
            <AnimatePresence>
              {fieldError.general && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-montreal"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                  {fieldError.general}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <div className="relative group">
                  <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                    fieldError.email ? "text-red-400" : "text-text-muted group-focus-within:text-accent-gold"
                  )}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldError.email) clearErrors() }}
                    className={cn(
                      "w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all duration-300",
                      fieldError.email
                        ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                        : "border-white/10 focus:border-accent-gold/50 focus:ring-accent-gold/10"
                    )}
                  />
                </div>
                <AnimatePresence>
                  {fieldError.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-400 font-montreal pl-1"
                    >
                      {fieldError.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative group">
                  <div className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                    fieldError.password ? "text-red-400" : "text-text-muted group-focus-within:text-accent-gold"
                  )}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldError.password) clearErrors() }}
                    className={cn(
                      "w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all duration-300",
                      fieldError.password
                        ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                        : "border-white/10 focus:border-accent-gold/50 focus:ring-accent-gold/10"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <AnimatePresence>
                  {fieldError.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-400 font-montreal pl-1"
                    >
                      {fieldError.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent-gold focus:ring-accent-gold/20" />
                  <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors font-montreal">Remember me</span>
                </label>
                <button type="button" className="text-xs text-accent-gold/80 hover:text-accent-gold transition-colors font-bold uppercase tracking-widest">Forgot?</button>
              </div>
            )}

            <FloatingButton 
              type="submit" 
              className="w-full py-4 rounded-2xl text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>{isLogin ? 'Continue' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </FloatingButton>
          </form>

          {/* Divider */}
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.4em] text-text-muted bg-transparent">
              <span className="px-4 bg-[#0B0B0B]">Or Secure With</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => handleOAuth('github')}
              className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-white group"
            >
              <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
              GitHub
            </button>
            <button 
              type="button"
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-xs font-bold text-white group"
            >
              <Box className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Google
            </button>
          </div>

          {/* Footer Toggle */}
          <div className="mt-10 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); clearErrors() }}
              className="text-xs text-text-muted hover:text-white transition-colors font-montreal"
            >
              {isLogin ? (
                <>Don't have an account? <span className="text-accent-gold font-bold">Sign Up</span></>
              ) : (
                <>Already a member? <span className="text-accent-gold font-bold">Sign In</span></>
              )}
            </button>
          </div>
        </GlassCard>

        {/* Security Footer */}
        <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40">
          <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> SOC2 COMPLIANT</div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">AES-256 ENCRYPTED</div>
        </div>
      </motion.div>
    </div>
  )
}
