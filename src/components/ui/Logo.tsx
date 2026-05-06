import React from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  collapsed?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md',
  animate = true,
  collapsed = false
}) => {
  const sizeMap = {
    sm: { h: 20, w: 120, view: "0 0 400 100" },
    md: { h: 32, w: 180, view: "0 0 400 100" },
    lg: { h: 48, w: 260, view: "0 0 400 100" },
    xl: { h: 80, w: 450, view: "0 0 400 100" }
  }

  const current = sizeMap[size]

  return (
    <div className={cn("flex items-center group select-none", className)}>
      <motion.div 
        className="relative"
        initial={animate ? { opacity: 0, x: -10 } : {}}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg 
          width={collapsed ? current.h * 0.8 : current.w} 
          height={current.h} 
          viewBox={collapsed ? "15 0 60 100" : current.view} 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="transition-all duration-700 ease-[0.22, 1, 0.36, 1]"
        >
          {/* F (The Iconic Foundation) */}
          <path 
            d="M20 20H75M20 20V80M20 50H65" 
            stroke="white" 
            strokeWidth="12" 
            strokeLinecap="square"
          />
          
          {!collapsed && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* L */}
              <path d="M100 20V80H155" stroke="white" strokeWidth="12" strokeLinecap="square" />
              
              {/* U */}
              <path d="M185 20V65C185 73.28 191.72 80 200 80H225C233.28 80 240 73.28 240 65V20" stroke="white" strokeWidth="12" strokeLinecap="square" />
              
              {/* THE PRECISION X (Memorable Cut) */}
              <g>
                <path d="M265 20L295 50" stroke="white" strokeWidth="12" strokeLinecap="square" />
                <path d="M305 60L335 90" stroke="white" strokeWidth="12" strokeLinecap="square" />
                <path d="M335 20L265 90" stroke="white" strokeWidth="12" strokeLinecap="square" />
                
                {/* Micro-detail Cut in the middle */}
                <path d="M290 55L310 55" stroke="#050505" strokeWidth="4" />
              </g>
              
              {/* AI (The Gold Highlight) */}
              <g>
                <text
                  x="355"
                  y="78"
                  fill="url(#premium_gold)"
                  fontSize="72"
                  fontWeight="900"
                  fontFamily="clash"
                  style={{ fontStyle: 'italic', letterSpacing: '-0.02em' }}
                  filter="url(#subtle_glow)"
                >
                  AI
                </text>
              </g>
            </motion.g>
          )}

          <defs>
            <linearGradient id="premium_gold" x1="355" y1="20" x2="420" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D4AF37" />
              <stop offset="0.5" stopColor="#F5E6AD" />
              <stop offset="1" stopColor="#AA8A2E" />
            </linearGradient>

            <filter id="subtle_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>

        {/* Shimmer Effect */}
        {animate && !collapsed && (
          <motion.div 
            className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay"
          >
            <motion.div 
              className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-20"
              animate={{ x: ['-150%', '200%'] }}
              transition={{ duration: 7, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
