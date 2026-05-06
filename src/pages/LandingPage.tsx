import React from 'react'
import { motion } from "framer-motion"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { AmbientGlow } from "@/components/ui/AmbientGlow"
import { Zap, Shield, Globe, ChevronRight, Play } from "lucide-react"
import { Logo } from "@/components/ui/Logo"

export const LandingPage = ({ onStart }: { onStart: () => void }) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6">
      <AmbientGlow size="xl" color="accent-gold" className="top-[-20%] opacity-[0.08]" />
      <AmbientGlow size="lg" color="white" className="bottom-[-10%] left-[-10%] opacity-[0.03]" />
      
      <nav className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between max-w-7xl mx-auto w-full z-50">
        <Logo size="lg" />
        
        <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
          <a href="#" className="hover:text-white transition-colors">Platform</a>
          <a href="#" className="hover:text-white transition-colors">Solutions</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
          <a href="#" className="hover:text-white transition-colors">Enterprise</a>
        </div>
        
        <FloatingButton onClick={onStart} className="h-10 px-6 text-[10px]">
          Launch App
        </FloatingButton>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-xl">
            <Zap className="w-4 h-4 text-accent-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-gold">Quantum QA Intelligence v2.0</span>
            <div className="h-3 w-px bg-white/10" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Early Access</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-clash font-bold text-white leading-tight mb-8">
            The IQ behind <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold via-white to-accent-gold animate-glow-pulse">your QA</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-text-secondary font-montreal max-w-3xl mx-auto leading-relaxed mb-12">
            Flux AI transforms messy requirements and rough notes into professional QA infrastructure. Faster, smarter, and deeper than ever before.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <FloatingButton onClick={onStart} className="h-16 px-12 text-sm">
              Get Started for Free <ChevronRight className="w-4 h-4 ml-2" />
            </FloatingButton>
            <button className="flex items-center gap-3 px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all text-white">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-3 h-3 fill-white" />
              </div>
              Watch Film
            </button>
          </div>
        </motion.div>
      </div>

      {/* Background Cinematic Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0,transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-[500px] bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Floating Features (Minimal) */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-24 text-[10px] font-black uppercase tracking-[0.4em] text-text-muted opacity-40 z-10">
        <div className="flex items-center gap-4"><Shield className="w-4 h-4" /> SECURE BY DEFAULT</div>
        <div className="flex items-center gap-4"><Globe className="w-4 h-4" /> MULTI-MODEL SYNC</div>
        <div className="flex items-center gap-4"><Zap className="w-4 h-4" /> SUB-SECOND LATENCY</div>
      </div>
    </div>
  )
}
