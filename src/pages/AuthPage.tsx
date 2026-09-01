import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion"
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/routes'
import { Logo } from "@/components/ui/Logo"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import {
  Mail,
  MailOpen,
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
import { type PandaEvent } from '@/components/LazyPanda'
import { AssistantPanel } from '@/components/LazyPanda/AssistantPanel'
import { AuthFooter } from '@/components/LazyPanda/AuthFooter'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// ── Liquid Morphing Blobs (NEW) ──────────────────────────────────────────────

function LiquidBlobs() {
  const reduced = usePrefersReducedMotion()
  const blobs = [
    { id: 1, x: '15%', y: '15%', size: 400, color: '#6366f1', duration: 25 },
    { id: 2, x: '75%', y: '20%', size: 350, color: '#8b5cf6', duration: 30 },
    { id: 3, x: '60%', y: '75%', size: 450, color: '#ec4899', duration: 28 },
    { id: 4, x: '25%', y: '70%', size: 300, color: '#14b8a6', duration: 22 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {blobs.map((blob) => (
        <motion.div
          key={blob.id}
          className="absolute"
          style={{
            left: blob.x,
            top: blob.y,
            width: blob.size,
            height: blob.size,
          }}
          animate={reduced ? undefined : {
            x: [0, 50, -30, 40, 0],
            y: [0, -40, 30, -20, 0],
            scale: [1, 1.2, 0.9, 1.1, 1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={reduced ? undefined : {
            duration: blob.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle, ${blob.color}30 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
            animate={{
              borderRadius: [
                "60% 40% 30% 70% / 60% 30% 70% 40%",
                "30% 60% 70% 40% / 50% 60% 30% 60%",
                "40% 60% 60% 40% / 60% 40% 60% 40%",
                "60% 40% 30% 70% / 60% 30% 70% 40%",
              ],
            }}
            transition={reduced ? undefined : {
              duration: blob.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

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

// ── Wave Animation (NEW) ──────────────────────────────────────────────────────

function WaveAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: '40%' }}
      >
        <motion.path
          fill="url(#wave-gradient)"
          fillOpacity="0.1"
          initial={{
            d: "M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,186.7C672,203,768,181,864,154.7C960,128,1056,96,1152,96C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
          }}
          animate={{
            d: [
              "M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,186.7C672,203,768,181,864,154.7C960,128,1056,96,1152,96C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,128C672,107,768,85,864,90.7C960,96,1056,128,1152,138.7C1248,149,1344,139,1392,133.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
              "M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,186.7C672,203,768,181,864,154.7C960,128,1056,96,1152,96C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <defs>
          <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  )
}

// ── Sparkle particles ─────────────────────────────────────────────────────────

function SparkleParticles() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
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
  const reduced = usePrefersReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [-300, 300], [5, -5])
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5])

  const smoothRotateX = useSpring(rotateX, { damping: 20, stiffness: 100 })
  const smoothRotateY = useSpring(rotateY, { damping: 20, stiffness: 100 })

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
      {/* Breathing gradient border — pulses gently, no rotation */}
      <motion.div
        className="absolute -inset-[1px] rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #3b82f6, #a855f7, #10b981)',
          filter: 'blur(1px)',
        }}
        animate={reduced ? { opacity: 0.55 } : {
          opacity: [0.4, 0.75, 0.4],
          scale: [1, 1.002, 1],
        }}
        transition={reduced ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Outer breathing glow */}
      <motion.div
        className="absolute -inset-3 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #3b82f6, #a855f7, #10b981)',
          filter: 'blur(24px)',
        }}
        animate={reduced ? { opacity: 0.1 } : {
          opacity: [0.08, 0.2, 0.08],
          scale: [0.98, 1.01, 0.98],
        }}
        transition={reduced ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Card content with 3D tilt effect */}
      <motion.div
        className="relative bg-surface rounded-3xl overflow-hidden"
        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ── Floating particles (works in both dark and light mode) ────────────────────

function FloatingParticles() {
  const reduced = usePrefersReducedMotion()
  if (reduced) return null
  const particles = Array.from({ length: 35 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 4,
    drift: (Math.random() - 0.5) * 60,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'var(--accent)',
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, p.drift, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
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

// ── Input Focus Particle Burst (NEW) ──────────────────────────────────────────

function ParticleBurst({ x, y, active }: { x: number; y: number; active: boolean }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 360) / 12,
  }))

  if (!active) return null

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-accent"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * 40,
            y: Math.sin((p.angle * Math.PI) / 180) * 40,
            opacity: 0,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
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

// ── Morphing text animation ───────────────────────────────────────────────────

function MorphingHeading({ isLogin }: { isLogin: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.h1
          key={isLogin ? 'login' : 'signup'}
          initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl sm:text-3xl font-clash font-bold text-text-primary text-center relative"
        >
          {/* Shimmer effect overlay */}
          <span className="relative inline-block">
            {isLogin ? 'Welcome Back' : 'Create Your Account'}
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
              animate={{
                backgroundPosition: ['-200% 0%', '200% 0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </span>
        </motion.h1>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.p
          key={isLogin ? 'login-sub' : 'signup-sub'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="text-sm text-text-secondary font-montreal"
        >
          {isLogin ? 'Sign in to Qaly AI Engine' : 'Join Qaly AI Engine'}
        </motion.p>
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
  const location = useLocation()
  const navigate = useNavigate()
  const isLogin = location.pathname !== ROUTES.signup
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string; general?: string }>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [particleBurst, setParticleBurst] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

  // Lazy Panda integration
  const pandaSendRef = useRef<((event: PandaEvent) => void) | null>(null)
  const pandaReady = useCallback((send: (event: PandaEvent) => void) => { pandaSendRef.current = send }, [])
  const pandaSend = (event: PandaEvent) => pandaSendRef.current?.(event)

  const [signupSuccessEmail, setSignupSuccessEmail] = useState<string | null>(null)

  const clearErrors = () => setFieldError({})

  const triggerParticleBurst = (e: React.FocusEvent<HTMLInputElement>) => {
    const rect = e.target.getBoundingClientRect()
    setParticleBurst({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      active: true,
    })
    setTimeout(() => setParticleBurst(prev => ({ ...prev, active: false })), 100)
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
    } catch (error: any) {
      console.error('[AuthPage] Authentication failed:', error)
      pandaSend({ type: 'LOGIN_ERROR' })
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

  if (signupSuccessEmail) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        {/* Animated Background Layers */}
        <LiquidBlobs />
        <FloatingOrbs />
        <AnimatedGrid />
        <SparkleParticles />
        <FloatingParticles />
        <WaveAnimation />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[480px] px-4 relative z-10"
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
                Please click the link in the email to activate your account and start using Qaly AI Engine.
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Layers */}
      <LiquidBlobs />
      <FloatingOrbs />
      <AnimatedGrid />
      <SparkleParticles />
      <FloatingParticles />
      <WaveAnimation />

      {/* Particle burst effect */}
      <ParticleBurst {...particleBurst} />

      {/* 2-Column Layout: Assistant Panel (left half) + Auth Card (right half) */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">

        {/* Left: Lazy Panda Assistant Panel (hidden on mobile) */}
        <AssistantPanel isSignUp={!isLogin} onPandaReady={pandaReady} />

        {/* Right: Authentication Card */}
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px]"
          >
            {/* Back to Landing Link */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              onClick={() => navigate(ROUTES.landing)}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-12 text-xs font-bold uppercase tracking-widest group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Landing Page
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
                    <div className="mb-8">
                      <Logo size="lg" animate={false} />
                    </div>

                    <MorphingHeading isLogin={isLogin} />
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
                            "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10 pointer-events-none",
                            fieldError.email ? "text-red-400" : focusedField === 'email' ? "text-accent scale-110" : "text-text-muted"
                          )}>
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            tabIndex={1}
                            autoComplete="email"
                            onFocus={(e) => {
                              setFocusedField('email');
                              pandaSend({ type: 'EMAIL_FOCUS' });
                              triggerParticleBurst(e);
                            }}
                            onBlur={() => { setFocusedField(null); pandaSend({ type: 'EMAIL_BLUR' }) }}
                            onChange={(e) => { setEmail(e.target.value); pandaSend({ type: 'EMAIL_TYPING' }); if (fieldError.email) clearErrors() }}
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
                            "absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10 pointer-events-none",
                            fieldError.password ? "text-red-400" : focusedField === 'password' ? "text-accent scale-110" : "text-text-muted"
                          )}>
                            <Lock className="w-4 h-4" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            tabIndex={2}
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            onFocus={(e) => {
                              setFocusedField('password');
                              pandaSend({ type: 'PASSWORD_FOCUS' });
                              triggerParticleBurst(e);
                            }}
                            onBlur={() => { setFocusedField(null); pandaSend({ type: 'PASSWORD_BLUR' }) }}
                            onChange={(e) => { setPassword(e.target.value); if (fieldError.password) clearErrors() }}
                            className={cn(
                              "relative w-full bg-white/5 border rounded-2xl py-4 pl-12 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-4 transition-all duration-300",
                              fieldError.password
                                ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                                : "border-border focus:border-accent/50 focus:ring-accent/10"
                            )}
                          />
                          <CreativePasswordToggle
                            showPassword={showPassword}
                            onToggle={() => {
                              const next = !showPassword
                              setShowPassword(next)
                              pandaSend({ type: 'PASSWORD_SHOW_TOGGLE', visible: next })
                            }}
                          />
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
                          <input
                            type="checkbox"
                            tabIndex={3}
                            className="w-4 h-4 rounded border-border bg-white/5 text-accent focus:ring-accent/20"
                          />
                          <span className="text-xs text-text-muted group-hover:text-text-secondary transition-colors font-montreal">Remember me</span>
                        </label>
                        <motion.button
                          onClick={handleForgotPassword}
                          type="button"
                          tabIndex={4}
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
                        tabIndex={5}
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
                      onClick={() => { navigate(isLogin ? ROUTES.signup : ROUTES.login, { replace: true }); clearErrors() }}
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

            {/* Premium Auth Footer */}
            <AuthFooter />
          </motion.div>
        </div>

      </div>
    </div>
  )
}
