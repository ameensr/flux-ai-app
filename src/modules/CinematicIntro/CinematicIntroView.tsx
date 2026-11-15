// src/modules/CinematicIntro/CinematicIntroView.tsx
// Full-screen Cinematic AI Command Center Introduction Orchestrator

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  ChevronDown,
  Radio,
  Eye,
  Plus,
  Minus,
  Sun,
  Moon,
} from 'lucide-react'
import { ThreeCanvas } from './ThreeCanvas'
import { HolographicPanels } from './HolographicPanels'
import { cinematicAudio } from './audioService'
import { fetchAvailableProjects, loadCinematicProjectData } from './cinematicDataService'
import type { IntroScene, CinematicProjectData } from './types'
import { ROUTES } from '@/lib/routes'
import { Logo } from '@/components/ui/Logo'
import { useTheme } from '@/context/ThemeContext'

const SCENE_LABELS: Array<{ id: IntroScene; label: string; number: string }> = [
  { id: 'scene_01_init', label: 'Initialization', number: '01' },
  { id: 'scene_02_platform', label: 'Platform Build', number: '02' },
  { id: 'scene_03_team', label: 'Team Assembly', number: '03' },
  { id: 'scene_04_hologram', label: 'Holographic Feed', number: '04' },
  { id: 'scene_05_reveal', label: 'Cinematic Reveal', number: '05' },
  { id: 'scene_06_interactive', label: 'Interactive Command', number: '06' },
]

export const CinematicIntroView: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || undefined
  const { isDark, toggleTheme } = useTheme()

  // State
  const [activeScene, setActiveScene] = useState<IntroScene>('scene_01_init')
  const [isAudioMuted, setIsAudioMuted] = useState(true)
  const [projectsList, setProjectsList] = useState<Array<{ id: string; name: string; project_code?: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || 'default')
  const [projectData, setProjectData] = useState<CinematicProjectData | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const activeSceneRef = useRef<IntroScene>('scene_01_init')
  const animProgressRef = useRef<number | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const hasTriggeredExit = useRef(false)

  // Load project list & active project data
  useEffect(() => {
    async function loadData() {
      const projects = await fetchAvailableProjects()
      setProjectsList(projects)
      const targetId = initialProjectId || projects[0]?.id || 'default'
      setSelectedProjectId(targetId)
      const data = await loadCinematicProjectData(targetId)
      setProjectData(data)
    }
    loadData()
  }, [initialProjectId])

  // Handle switching projects
  const handleSelectProject = async (id: string) => {
    setSelectedProjectId(id)
    setIsProjectDropdownOpen(false)
    const data = await loadCinematicProjectData(id)
    setProjectData(data)
  }

  // Audio Toggle
  const toggleAudio = () => {
    const next = !isAudioMuted
    setIsAudioMuted(next)
    cinematicAudio.setMuted(next)
  }

  // Buttery-smooth exit to dashboard or project
  const triggerExit = useCallback(() => {
    if (hasTriggeredExit.current) return
    hasTriggeredExit.current = true
    setIsExiting(true)
    cinematicAudio.stopAmbientHum()

    setTimeout(() => {
      if (selectedProjectId && selectedProjectId !== 'default') {
        navigate(`${ROUTES.projectHub}/${selectedProjectId}`, { replace: true })
      } else {
        navigate(ROUTES.dashboard, { replace: true })
      }
    }, 600)
  }, [navigate, selectedProjectId])

  // High-performance timeline sequence: direct DOM progress update
  const startSequence = useCallback(() => {
    if (animProgressRef.current) cancelAnimationFrame(animProgressRef.current)

    hasTriggeredExit.current = false
    setIsExiting(false)
    activeSceneRef.current = 'scene_01_init'
    setActiveScene('scene_01_init')

    if (progressBarRef.current) {
      progressBarRef.current.style.width = '0%'
    }

    const startTime = performance.now()
    const totalDuration = 11000 // 11s total cinematic intro before interactive mode

    const updateProgress = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min((elapsed / totalDuration) * 100, 100)

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${p}%`
      }

      let nextScene: IntroScene = 'scene_01_init'
      if (elapsed < 2000) {
        nextScene = 'scene_01_init'
      } else if (elapsed < 4000) {
        nextScene = 'scene_02_platform'
      } else if (elapsed < 6000) {
        nextScene = 'scene_03_team'
      } else if (elapsed < 9000) {
        nextScene = 'scene_04_hologram'
      } else if (elapsed < 11000) {
        nextScene = 'scene_05_reveal'
      } else {
        nextScene = 'scene_06_interactive'
      }

      if (activeSceneRef.current !== nextScene) {
        activeSceneRef.current = nextScene
        setActiveScene(nextScene)
      }

      if (elapsed < totalDuration) {
        animProgressRef.current = requestAnimationFrame(updateProgress)
      }
    }

    animProgressRef.current = requestAnimationFrame(updateProgress)
  }, [])

  // Start sequence on mount
  useEffect(() => {
    startSequence()
    return () => {
      if (animProgressRef.current) cancelAnimationFrame(animProgressRef.current)
    }
  }, [startSequence])

  // Sound triggers on scene transitions
  useEffect(() => {
    if (activeScene === 'scene_03_team') {
      cinematicAudio.playPulseChime()
    } else if (activeScene === 'scene_04_hologram') {
      cinematicAudio.playHologramSwoosh()
    } else if (activeScene === 'scene_05_reveal') {
      cinematicAudio.playPulseChime()
    }
  }, [activeScene])

  // Keyboard shortcuts (Escape to exit; R to replay; M to mute/unmute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerExit()
      } else if (e.key === 'r' || e.key === 'R') {
        startSequence()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleAudio()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerExit, startSequence, toggleAudio])

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={
        isExiting
          ? {
              y: '-100%',
              opacity: 0.1,
              filter: 'blur(8px)',
              transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
            }
          : {
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
              transition: { duration: 0.4 },
            }
      }
      className={`fixed inset-0 w-screen h-screen overflow-hidden select-none transition-colors duration-500 z-50 ${
        isDark ? 'bg-[#0c141a] text-white' : 'bg-[#f1f5f4] text-slate-800'
      }`}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {/* ── 3D Canvas Layer ──────────────────────────────────────────────────── */}
      <ThreeCanvas
        activeScene={activeScene}
        isInteractive={activeScene === 'scene_06_interactive'}
        selectedPanelId={selectedPanelId}
        onPanelClick={(id) => setSelectedPanelId(id)}
        projectData={projectData}
        isDark={isDark}
      />

      {/* ── Holographic Dashboards & Analytics Panels Layer ───────────────────── */}
      {projectData && (
        <HolographicPanels
          data={projectData}
          activeScene={activeScene}
          activePanelId={selectedPanelId}
          onSelectPanel={setSelectedPanelId}
          isDark={isDark}
        />
      )}

      {/* ── Top Header Navigation & Unified Controls Bar ─────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-between pointer-events-none">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Logo size="md" />
          <div className={`h-4 w-px hidden sm:block ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md border shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-700/80 text-slate-300' : 'bg-white/75 border-white/80 text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              AI Command Centre
            </span>
          </div>
        </div>

        {/* Center: Live Project Selector Dropdown */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl backdrop-blur-xl border shadow-sm hover:shadow transition text-xs font-semibold ${
              isDark
                ? 'bg-slate-900/85 border-slate-700/80 text-white hover:bg-slate-800'
                : 'bg-white/85 border-white text-slate-800 hover:bg-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span className="max-w-[110px] sm:max-w-[200px] truncate">
              {projectData?.projectName || 'Flux AI Core'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {isProjectDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 backdrop-blur-2xl rounded-2xl shadow-2xl border p-2 z-50 overflow-hidden ${
                  isDark
                    ? 'bg-slate-900/95 border-slate-700 text-white'
                    : 'bg-white/95 border-slate-100 text-slate-800'
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 px-3 py-1.5">
                  Select Project Telemetry
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {projectsList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                        p.id === selectedProjectId
                          ? isDark
                            ? 'bg-teal-950/80 text-teal-300 font-bold border border-teal-800'
                            : 'bg-teal-50 text-teal-900 font-bold border border-teal-100'
                          : isDark
                          ? 'hover:bg-slate-800/80 text-slate-300'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.project_code || 'PRJ'}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Unified Controls Toolbar: Zoom, Audio, Theme, Replay, Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Zoom controls (In, Out, Reset) */}
          <div
            className={`hidden md:flex items-center gap-0.5 p-0.5 rounded-full backdrop-blur-md border shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-700/80' : 'bg-white/80 border-white'
            }`}
          >
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('cinematic:zoom', { detail: { delta: 0.2 } })
                )
              }}
              title="Zoom In (Scroll Down)"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('cinematic:zoom', { detail: { delta: -0.2 } })
                )
              }}
              title="Zoom Out (Scroll Up)"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                isDark ? 'hover:bg-slate-800 text-slate-300 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('cinematic:zoom', { detail: { reset: true } })
                )
              }}
              title="Reset 3D View"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Theme toggle (Sun / Moon) */}
          <button
            onClick={(e) => toggleTheme(e)}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition ${
              isDark
                ? 'bg-slate-900/80 border-slate-700/80 text-amber-400 hover:bg-slate-800'
                : 'bg-white/80 border-white text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            title={isAudioMuted ? 'Enable Sound FX' : 'Mute Sound'}
            className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition ${
              isDark
                ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-white text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-teal-400" />
            )}
          </button>

          {/* Replay */}
          <button
            onClick={startSequence}
            title="Replay Cinematic Intro (R)"
            className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition ${
              isDark
                ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                : 'bg-white/80 border-white text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* SKIP INTRO / LAUNCH WORKSPACE */}
          <button
            onClick={triggerExit}
            className="group relative flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg text-xs font-semibold tracking-wide transition-all border border-slate-700"
          >
            <span>{activeScene === 'scene_06_interactive' ? 'Launch Workspace' : 'Skip Intro'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* ── Bottom Timeline Scrubber & Integrated Status Pill ─────────────────── */}
      <footer className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-40 px-4 sm:px-12 flex flex-col items-center pointer-events-none">
        {/* Single Integrated Status Pill (Eliminates overlap) */}
        <div
          className={`mb-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border shadow-sm text-[11px] font-medium pointer-events-auto transition-colors ${
            isDark
              ? 'bg-slate-900/85 border-slate-700/80 text-slate-300'
              : 'bg-white/90 border-white text-slate-600'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>
            {activeScene === 'scene_06_interactive'
              ? 'Interactive 3D Mode • Scroll to zoom • Drag to orbit • Click cards to inspect'
              : 'Cinematic Introduction Sequence • Scroll to zoom • Drag to orbit'}
          </span>
        </div>

        {/* Stage Pills & Scrubber */}
        <div
          className={`pointer-events-auto flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full backdrop-blur-2xl border shadow-lg max-w-2xl w-full justify-between transition-colors ${
            isDark
              ? 'bg-slate-900/85 border-slate-700/80'
              : 'bg-white/85 border-white'
          }`}
        >
          {SCENE_LABELS.map((item) => {
            const isActive = activeScene === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  activeSceneRef.current = item.id
                  setActiveScene(item.id)
                }}
                className={`flex-1 py-1 sm:py-1.5 px-1.5 sm:px-2.5 rounded-full text-center transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                  isActive
                    ? isDark
                      ? 'bg-teal-500 text-slate-950 font-black shadow-md scale-[1.02]'
                      : 'bg-slate-900 text-white font-bold shadow-sm scale-[1.02]'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-medium'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 text-xs font-medium'
                }`}
              >
                <span
                  className={`text-[9px] font-mono ${
                    isActive
                      ? isDark
                        ? 'text-slate-950 font-black'
                        : 'text-teal-300'
                      : isDark
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                >
                  {item.number}
                </span>
                <span className="text-[10px] sm:text-xs truncate hidden sm:inline">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Thin progress bar line (Direct DOM width updates for zero frame drops) */}
        <div
          className={`w-48 sm:w-72 h-1 rounded-full mt-2 overflow-hidden pointer-events-none ${
            isDark ? 'bg-slate-800' : 'bg-slate-200/80'
          }`}
        >
          <div
            ref={progressBarRef}
            className="h-full bg-gradient-to-r from-teal-400 to-[#ff7557] transition-all duration-75"
            style={{ width: '0%' }}
          />
        </div>
      </footer>
    </motion.div>
  )
}
