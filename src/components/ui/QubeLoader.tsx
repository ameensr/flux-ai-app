import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { MorphingInfinity } from './MorphingInfinity'

export { MorphingInfinity }

export type QubeLoaderVariant = 'fullscreen' | 'page' | 'inline' | 'overlay' | 'micro'
export type QubeLoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface QubeLoaderProps {
  /** Display variant */
  variant?: QubeLoaderVariant
  /** Size multiplier */
  size?: QubeLoaderSize
  /** Optional custom status message displayed beneath QUBE */
  text?: string
  /** Whether to show the QUBE wordmark below the icon (defaults to true except for 'micro') */
  showWordmark?: boolean
  /** Whether to show the animated micro hairline progress pulse */
  showProgress?: boolean
  /** Additional container styling */
  className?: string
  /** Subtitle descriptor below the wordmark (defaults to 'AI ENGINE') */
  subtitle?: string
}

const SIZE_CONFIG = {
  xs: { box: 'w-5 h-5', text: 'text-[9px]', tracking: 'tracking-[0.2em]', gap: 'gap-1' },
  sm: { box: 'w-7 h-7', text: 'text-[11px]', tracking: 'tracking-[0.25em]', gap: 'gap-2' },
  md: { box: 'w-10 h-10', text: 'text-xs', tracking: 'tracking-[0.3em]', gap: 'gap-2.5' },
  lg: { box: 'w-14 h-14', text: 'text-sm', tracking: 'tracking-[0.35em]', gap: 'gap-3.5' },
  xl: { box: 'w-18 h-18', text: 'text-base', tracking: 'tracking-[0.4em]', gap: 'gap-4' },
}

/**
 * ─── Main QubeLoader Component ────────────────────────────────────────────────
 * Combines MorphingInfinity with QUBE brand typography and progressive indicator.
 */
export const QubeLoader: React.FC<QubeLoaderProps> = ({
  variant = 'page',
  size,
  text,
  showWordmark = true,
  showProgress = true,
  className,
  subtitle = 'AI ENGINE',
}) => {
  const effectiveSize: QubeLoaderSize = size || (
    variant === 'fullscreen' ? 'lg' :
    variant === 'page' ? 'md' :
    variant === 'overlay' ? 'md' :
    variant === 'inline' ? 'sm' : 'xs'
  )

  const s = SIZE_CONFIG[effectiveSize]
  const isMicro = variant === 'micro'

  // Micro spinner variant (for buttons, tags, micro status pills)
  if (isMicro) {
    return (
      <MorphingInfinity
        className={cn(s.box, 'text-accent', className)}
      />
    )
  }

  const content = (
    <div className={cn('flex flex-col items-center justify-center text-center select-none', s.gap)}>
      {/* Morphing Infinity Geometric Icon with soft aura */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-xl pointer-events-none opacity-40 dark:opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(147, 51, 234, 0.25) 45%, transparent 75%)',
            transform: 'scale(1.5)',
          }}
        />

        <motion.div
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 flex items-center justify-center"
        >
          <MorphingInfinity
            className={cn(s.box, 'text-accent drop-shadow-[0_0_14px_rgba(99,102,241,0.55)]')}
          />
        </motion.div>
      </div>

      {/* Brand Wordmark: Q U B E */}
      {showWordmark && (
        <div className="flex flex-col items-center mt-1">
          <div className="flex items-center tracking-[0.35em] font-extrabold font-inter">
            <motion.span
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm font-black"
              style={{ fontSize: effectiveSize === 'lg' || effectiveSize === 'xl' ? '1.15rem' : '0.92rem' }}
            >
              QUBE
            </motion.span>
          </div>

          {subtitle && (
            <span
              className="uppercase tracking-[0.25em] font-medium text-text-muted mt-0.5"
              style={{ fontSize: effectiveSize === 'lg' || effectiveSize === 'xl' ? '0.62rem' : '0.52rem' }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Hairline Progress Lightbeam */}
      {showProgress && (
        <div className="w-24 h-[2px] rounded-full bg-border/60 overflow-hidden relative my-0.5">
          <motion.div
            className="absolute top-0 bottom-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}

      {/* Contextual Status / Buffering Text */}
      <AnimatePresence mode="wait">
        {text ? (
          <motion.p
            key={text}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-medium text-text-secondary tracking-wide flex items-center gap-1.5"
          >
            <span>{text}</span>
            <span className="inline-flex gap-0.5">
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}>.</motion.span>
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}>.</motion.span>
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}>.</motion.span>
            </span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )

  if (variant === 'fullscreen') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[9999] flex flex-col items-center justify-center',
          'bg-background/95 backdrop-blur-md transition-colors duration-300',
          className
        )}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-50"
          style={{
            background: 'radial-gradient(circle 600px at center, rgba(99, 102, 241, 0.12), transparent 70%)',
          }}
        />
        {content}
      </div>
    )
  }

  if (variant === 'overlay') {
    return (
      <div
        className={cn(
          'absolute inset-0 z-30 flex flex-col items-center justify-center',
          'bg-background/80 backdrop-blur-sm rounded-[inherit] transition-all duration-200',
          className
        )}
      >
        {content}
      </div>
    )
  }

  if (variant === 'page') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center min-h-[58vh] w-full p-8',
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-6 px-4 w-full',
        className
      )}
    >
      {content}
    </div>
  )
}

export const QubePageLoader: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <QubeLoader variant="page" text={text} className={className} />
)

export const QubeFullPageLoader: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <QubeLoader variant="fullscreen" text={text} className={className} />
)

export const QubeOverlayLoader: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <QubeLoader variant="overlay" text={text} className={className} />
)

export const QubeSpinner: React.FC<{ size?: QubeLoaderSize; className?: string }> = ({ size = 'xs', className }) => (
  <QubeLoader variant="micro" size={size} className={className} />
)

export default QubeLoader
