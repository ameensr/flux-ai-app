import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Info, AlertTriangle, Check, X, Shield, Star, Mail, Zap, CheckCheck, Users, TrendingUp } from 'lucide-react'

interface KPIMetric {
  label: string
  val: number
  suffix?: string
  icon: any
  color: string
  desc: string
  sparklineData?: number[]
  pulse?: boolean
  tooltip?: string
  category: 'primary' | 'releaseHealth' | 'testingQuality' | 'supportOps' | 'teamResources'
}

interface ExecutiveKPISectionProps {
  kpiMetrics: KPIMetric[]
  expandedCategories: Record<string, boolean>
  onToggleCategory: (categoryId: string) => void
  hoveredKPI: string | null
  onHoverKPI: (label: string | null) => void
  theme: 'light' | 'dark'
  CountUpNumber: React.ComponentType<{ end: number; suffix?: string; decimals?: number }>
  MiniSparkline: React.ComponentType<{ data: number[]; color: string; className?: string }>
}

export const ExecutiveKPISection: React.FC<ExecutiveKPISectionProps> = ({
  kpiMetrics,
  expandedCategories,
  onToggleCategory,
  hoveredKPI,
  onHoverKPI,
  theme,
  CountUpNumber,
  MiniSparkline
}) => {
  const categories = [
    {
      id: 'releaseHealth',
      title: 'Release Health',
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: theme === 'dark' ? 'bg-blue-500/5' : 'bg-blue-50',
      borderColor: theme === 'dark' ? 'border-blue-500/20' : 'border-blue-200'
    },
    {
      id: 'testingQuality',
      title: 'Testing Quality',
      icon: CheckCheck,
      color: 'text-green-400',
      bgColor: theme === 'dark' ? 'bg-green-500/5' : 'bg-green-50',
      borderColor: theme === 'dark' ? 'border-green-500/20' : 'border-green-200'
    },
    {
      id: 'supportOps',
      title: 'Support Operations',
      icon: Mail,
      color: 'text-purple-400',
      bgColor: theme === 'dark' ? 'bg-purple-500/5' : 'bg-purple-50',
      borderColor: theme === 'dark' ? 'border-purple-500/20' : 'border-purple-200'
    },
    {
      id: 'teamResources',
      title: 'Team & Resources',
      icon: Users,
      color: 'text-amber-400',
      bgColor: theme === 'dark' ? 'bg-amber-500/5' : 'bg-amber-50',
      borderColor: theme === 'dark' ? 'border-amber-500/20' : 'border-amber-200'
    }
  ]

  const primaryMetrics = kpiMetrics.filter(m => m.category === 'primary')
  const categorizedMetrics = categories.map(cat => ({
    ...cat,
    metrics: kpiMetrics.filter(m => m.category === cat.id)
  }))

  // Calculate preview stats for each category
  const getCategoryPreview = (categoryId: string) => {
    const metrics = kpiMetrics.filter(m => m.category === categoryId)
    const critical = metrics.filter(m => m.pulse).length
    const total = metrics.length
    return { critical, total }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Executive Insight — minimal status line */}
      {(() => {
        const activeIssues = kpiMetrics.filter(m => m.pulse).length
        const passRate = primaryMetrics.find(m => m.label === 'Release Testing Progress')?.val || 0
        const activeBugs = primaryMetrics.find(m => m.label === 'Active Bugs')?.val || 0

        const level =
          activeIssues === 0 && passRate >= 90
            ? 'high'
            : activeIssues <= 2 && passRate >= 75
              ? 'moderate'
              : 'attention'

        const tone =
          level === 'high'
            ? { dot: 'bg-emerald-400', label: 'High', detail: 'All systems healthy · Ready for deployment' }
            : level === 'moderate'
              ? { dot: 'bg-amber-400', label: 'Moderate', detail: 'Minor issues detected · Proceed with caution' }
              : {
                  dot: 'bg-rose-400',
                  label: 'Needs attention',
                  detail: `${activeIssues} critical item${activeIssues === 1 ? '' : 's'} · ${activeBugs} active bug${activeBugs === 1 ? '' : 's'}`,
                }

        return (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 border-b ${
              theme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200/80'
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                theme === 'dark' ? 'text-white/35' : 'text-slate-400'
              }`}
            >
              Executive Insight
            </span>

            <span
              className={`hidden sm:block w-px h-3 ${
                theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
              }`}
              aria-hidden
            />

            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {level === 'attention' && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tone.dot}`} />
                )}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone.dot}`} />
              </span>
              <span
                className={`text-[11px] font-semibold tracking-wide ${
                  theme === 'dark' ? 'text-white/75' : 'text-slate-700'
                }`}
              >
                Release confidence · {tone.label}
              </span>
              <span
                className={`text-[11px] font-normal truncate ${
                  theme === 'dark' ? 'text-white/40' : 'text-slate-500'
                }`}
              >
                {tone.detail}
              </span>
            </span>
          </motion.div>
        )
      })()}

      {/* Primary Metrics — column count matches card count so the row fills evenly */}
      <div
        className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
          primaryMetrics.length === 3
            ? 'lg:grid-cols-3'
            : primaryMetrics.length >= 4
              ? 'lg:grid-cols-4'
              : ''
        }`}
      >
        {primaryMetrics.map((kpi, idx) => (
          <KPICard
            key={kpi.label}
            kpi={kpi}
            idx={idx}
            hoveredKPI={hoveredKPI}
            onHoverKPI={onHoverKPI}
            theme={theme}
            CountUpNumber={CountUpNumber}
            MiniSparkline={MiniSparkline}
          />
        ))}
      </div>

      {/* Categorized Sections - Collapsible */}
      <div className="flex flex-col gap-3">
        {categorizedMetrics.map((category, catIdx) => {
          const isExpanded = expandedCategories[category.id]
          const preview = getCategoryPreview(category.id)

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.05 }}
              className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => onToggleCategory(category.id)}
                className={`w-full p-4 flex items-center justify-between transition-all duration-300 group ${category.bgColor} hover:${category.bgColor.replace('/5', '/10')}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${category.bgColor} border ${category.borderColor}`}>
                    <category.icon className={`w-4 h-4 ${category.color}`} />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {category.title}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {preview.total} metrics
                      {preview.critical > 0 && ` • ${preview.critical} need attention`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Preview Values on Hover */}
                  {!isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="hidden lg:flex items-center gap-2"
                    >
                      {category.metrics.slice(0, 3).map((m, i) => (
                        <span
                          key={m.label}
                          className={`text-xs font-bold px-2 py-1 rounded-lg ${category.bgColor} ${category.borderColor} border`}
                        >
                          {m.val}{m.suffix}
                        </span>
                      ))}
                    </motion.div>
                  )}

                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className={`w-5 h-5 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} group-hover:${category.color} transition-colors`} />
                  </motion.div>
                </div>
              </button>

              {/* Category Content - Animated */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="p-4 border-t border-white/5">
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {category.metrics.map((kpi, idx) => (
                          <KPICard
                            key={kpi.label}
                            kpi={kpi}
                            idx={idx}
                            hoveredKPI={hoveredKPI}
                            onHoverKPI={onHoverKPI}
                            theme={theme}
                            CountUpNumber={CountUpNumber}
                            MiniSparkline={MiniSparkline}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  kpi: KPIMetric
  idx: number
  hoveredKPI: string | null
  onHoverKPI: (label: string | null) => void
  theme: 'light' | 'dark'
  CountUpNumber: React.ComponentType<{ end: number; suffix?: string; decimals?: number }>
  MiniSparkline: React.ComponentType<{ data: number[]; color: string; className?: string }>
  compact?: boolean
}

const KPICard: React.FC<KPICardProps> = ({
  kpi,
  idx,
  hoveredKPI,
  onHoverKPI,
  theme,
  CountUpNumber,
  MiniSparkline,
  compact = false
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePosition({ x, y })
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (kpi.tooltip) onHoverKPI(kpi.label)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setMousePosition({ x: 0, y: 0 })
    onHoverKPI(null)
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: idx * 0.08, type: 'spring', damping: 20, stiffness: 100 }}
      className={`p-5 rounded-[28px] border flex items-center justify-between group relative overflow-visible ${compact ? 'min-h-[120px]' : 'min-h-[140px]'} ${kpi.pulse ? 'ring-2 ring-red-500/30' : ''} ${theme === 'dark' ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.03)]'}`}
      style={{
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        transform: isHovered
          ? `perspective(1000px) rotateX(${mousePosition.y * -10}deg) rotateY(${mousePosition.x * 10}deg) translateY(-16px) translateZ(20px) scale(1.04)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) translateZ(0px) scale(1)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
        boxShadow: isHovered
          ? theme === 'dark'
            ? `0 30px 60px rgba(0,0,0,0.5), 0 15px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1), ${mousePosition.x * 25}px ${mousePosition.y * 25}px 40px rgba(212,175,55,0.12)`
            : `0 30px 60px rgba(15,23,42,0.15), 0 15px 30px rgba(15,23,42,0.08), 0 0 0 1px rgba(212,175,55,0.25), ${mousePosition.x * 20}px ${mousePosition.y * 20}px 35px rgba(212,175,55,0.1)`
          : undefined
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Lighting Effect */}
      <div
        className="absolute inset-0 rounded-[28px] pointer-events-none transition-opacity duration-300"
        style={{
          background: isHovered
            ? `radial-gradient(circle at ${(mousePosition.x + 0.5) * 100}% ${(mousePosition.y + 0.5) * 100}%, ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)'} 0%, transparent 50%)`
            : 'none',
          opacity: isHovered ? 1 : 0
        }}
      />
      {/* Premium Tooltip */}
      <AnimatePresence>
        {kpi.tooltip && hoveredKPI === kpi.label && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 pointer-events-none"
          >
            <div
              className={`px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-xl max-w-[200px] relative ${theme === 'dark'
                ? 'bg-gradient-to-br from-[#1a1a1a] via-[#1a1a1a] to-[#0a0a0a] border border-white/10'
                : 'bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200 shadow-slate-200/50'
                }`}
              style={{
                boxShadow: theme === 'dark'
                  ? '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                  : '0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-gold/5 via-transparent to-blue-500/5 pointer-events-none" />
              <p className={`text-[11px] font-medium leading-relaxed relative z-10 ${theme === 'dark' ? 'text-white/90' : 'text-slate-700'}`}>
                {kpi.tooltip}
              </p>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px]">
                <div
                  className={`w-2.5 h-2.5 rotate-45 ${theme === 'dark'
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-r border-b border-white/10'
                    : 'bg-gradient-to-br from-white to-slate-50 border-r border-b border-slate-200'
                    }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient Border Glow */}
      <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

      {/* Info Icon Indicator */}
      {kpi.tooltip && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
          <Info className="w-3.5 h-3.5 text-accent-gold" />
        </div>
      )}

      {/* Pulse indicator */}
      {kpi.pulse && (
        <span className="absolute top-4 right-4 flex h-2 w-2 z-30">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}

      {/* Left side content */}
      <div className="flex flex-col justify-between h-full w-[60%] z-20 relative py-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <kpi.icon className={`w-4 h-4 ${kpi.color} ${kpi.pulse ? 'animate-pulse' : ''}`} />
          </div>
          <span className={`text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>{kpi.label}</span>
        </div>

        <div className="mt-1">
          <span className={`${compact ? 'text-3xl' : 'text-4xl'} font-black block tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
            <CountUpNumber end={kpi.val} suffix={kpi.suffix} />
          </span>
        </div>
        
        {kpi.desc && !compact && (
          <p className="text-[10px] text-text-muted leading-normal mt-2 pr-2">{kpi.desc}</p>
        )}
      </div>

      {/* Right side large sparkline */}
      <div className="absolute right-0 bottom-0 top-0 w-[55%] pointer-events-none overflow-hidden rounded-r-[28px]">
        {/* Gradient fade from left to right to blend the sparkline perfectly with the background */}
        <div className={`absolute inset-y-0 left-0 w-12 z-10 ${theme === 'dark' ? 'bg-gradient-to-r from-[#131826] to-transparent' : 'bg-gradient-to-r from-white to-transparent'}`} />
        
        {kpi.sparklineData && kpi.sparklineData.length > 1 && (
          <div className="absolute right-0 bottom-0 w-full h-[75%] pb-3 pr-4 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
            <MiniSparkline 
              data={kpi.sparklineData} 
              color={kpi.color.includes('gold') ? '#d4af37' : kpi.color.includes('blue') ? '#60a5fa' : kpi.color.includes('green') ? '#4ade80' : kpi.color.includes('red') ? '#f87171' : kpi.color.includes('orange') ? '#fb923c' : '#a855f7'} 
              className="w-full h-full"
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}
